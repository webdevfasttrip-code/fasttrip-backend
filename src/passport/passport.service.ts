import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as path from 'path';
import * as mrz from 'mrz';

@Injectable()
export class PassportService {
  private client: DocumentProcessorServiceClient;
  
  constructor() {
    let credentials: any = undefined;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        if (credentials && credentials.private_key) {
          credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
      } catch (e) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON from env.");
      }
    }
    
    this.client = new DocumentProcessorServiceClient({
      credentials,
      apiEndpoint: 'asia-south1-documentai.googleapis.com',
    });
  }

  async processPassport(fileBuffer: Buffer, mimeType: string, filename: string, filesize: number) {
    console.log(`[OCR] Uploaded File: ${filename}, Size: ${filesize} bytes, Mime: ${mimeType}`);
    const projectId = process.env.GOOGLE_PROJECT_ID || '443723300452';
    const location = process.env.DOCUMENT_AI_LOCATION || 'asia-south1';
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || '9d7c23970cd4020c';

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const request = {
      name,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };
    
    console.log(`[OCR] Sending request to Google Document AI processor: ${processorId}`);

    try {
      const [result] = await this.client.processDocument(request);
      const { document } = result;

      if (!document || !document.text) {
        throw new Error('No text found in document');
      }

      const text = document.text;
      console.log(`[OCR] Received text length: ${text?.length}`);
      console.log(`[OCR] RAW TEXT: \n${text}\n-------------------`);
      
      // Extract MRZ lines
      const lines = text.split('\n').map(l => l.replace(/\s+/g, ''));
      // Find lines that look like MRZ, allow some common OCR errors for < like ( or { or [
      const mrzPattern = /^[A-Z0-9<\{\[\(]{30,44}$/;
      const mrzLines = lines.filter(l => mrzPattern.test(l)).map(l => l.replace(/[\{\[\(]/g, '<'));
      
      console.log(`[OCR] Found MRZ lines candidate count: ${mrzLines.length}`);

      let mrzData: any = null;
      let mrzText = "";

      if (mrzLines.length >= 2) {
        try {
            // Usually the last 2 or 3 lines are the MRZ
            const targetLines = mrzLines.slice(-2);
            if (targetLines[0].length === 44 && targetLines[1].length === 44) {
               const parsed = mrz.parse(targetLines);
               mrzData = parsed.fields;
               mrzText = targetLines.join('\\n');
            } else if (mrzLines.length >= 3) {
                const targetLines3 = mrzLines.slice(-3);
                const parsed = mrz.parse(targetLines3);
                mrzData = parsed.fields;
                mrzText = targetLines3.join('\\n');
            }
        } catch(e) {
            console.error("MRZ Parse Error", e);
        }
      }

      // Function to parse YYMMDD to YYYY-MM-DD
      const formatMrzDate = (dateStr: string) => {
          if (!dateStr || dateStr.length !== 6) return "";
          let year = parseInt(dateStr.substring(0, 2));
          const month = dateStr.substring(2, 4);
          const day = dateStr.substring(4, 6);
          // If year > 50 assume 19XX, else 20XX
          year += (year > 50) ? 1900 : 2000;
          return `${year}-${month}-${day}`;
      }

      // Cleanup trailing '<' from names
      const cleanName = (name: string) => name ? name.replace(/<+$/g, '').replace(/</g, ' ') : '';

      // 2. OCR Fallback parsing
      let ocrFallback: any = {
        passportNumber: "",
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        nationality: "Indian",
        placeOfIssue: "",
        issueDate: "",
        expiryDate: ""
      };

      const cleanLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (let i = 0; i < cleanLines.length; i++) {
        const line = cleanLines[i];
        if (line.includes('Surname') || line.includes('उपनाम')) {
           if (!ocrFallback.lastName && i + 1 < cleanLines.length) ocrFallback.lastName = cleanName(cleanLines[i+1]);
        }
        else if (line.includes('Given Name') || line.includes('Given Narne')) {
           if (!ocrFallback.firstName && i + 1 < cleanLines.length) ocrFallback.firstName = cleanName(cleanLines[i+1]);
        }
        else if (line.includes('Place of Birth') || line.includes('जन्म स्थान')) {
           if (!ocrFallback.placeOfBirth && i + 1 < cleanLines.length && !cleanLines[i+1].includes('Place')) {
               ocrFallback.placeOfBirth = cleanName(cleanLines[i+1]);
           }
        }
        else if (line.includes('Place of Issue') || line.includes('जारी करने का स्थान')) {
           if (!ocrFallback.placeOfIssue && i + 1 < cleanLines.length && !cleanLines[i+1].includes('Date')) {
               ocrFallback.placeOfIssue = cleanName(cleanLines[i+1]);
           }
        }
      }

      const formatOcrDate = (dateStr: string) => {
          if (!dateStr) return "";
          const parts = dateStr.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
          return "";
      };

      const dobMatch = text.match(/(?:Date of Birth|Birth|afafe)[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
      if (dobMatch) ocrFallback.dateOfBirth = formatOcrDate(dobMatch[1]);

      const issueMatch = text.match(/(?:Date of Issue|Issue|जारी)[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
      if (issueMatch) ocrFallback.issueDate = formatOcrDate(issueMatch[1]);

      const expiryMatch = text.match(/(?:Date of Expiry|Expiry|समाप्ति)[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
      if (expiryMatch) ocrFallback.expiryDate = formatOcrDate(expiryMatch[1]);

      const sexMatch = text.match(/(?:Sex|Pein)[\s\S]*?\n\s*(M|F|MALE|FEMALE)\s*\n/i);
      if (sexMatch) {
          const g = sexMatch[1].toUpperCase();
          ocrFallback.gender = (g === 'M' || g === 'MALE') ? 'Male' : 'Female';
      }

      const passNumMatch = text.match(/([A-Z]{1,2}[0-9]{6,7})/);
      if (passNumMatch) ocrFallback.passportNumber = passNumMatch[1];

      // 3. Merge data, preferring MRZ if available, but relying on OCR fallback otherwise
      const finalData = {
        passportNumber: (mrzData?.documentNumber ? cleanName(mrzData.documentNumber) : ocrFallback.passportNumber) || "",
        firstName: (mrzData?.firstName ? cleanName(mrzData.firstName) : ocrFallback.firstName) || "",
        lastName: (mrzData?.lastName ? cleanName(mrzData.lastName) : ocrFallback.lastName) || "",
        dateOfBirth: (mrzData?.birthDate ? formatMrzDate(mrzData.birthDate) : ocrFallback.dateOfBirth) || "",
        gender: (mrzData?.sex ? (mrzData.sex === 'male' || mrzData.sex === 'M' ? 'Male' : 'Female') : ocrFallback.gender) || "",
        nationality: (mrzData?.nationality ? cleanName(mrzData.nationality) : ocrFallback.nationality) || "Indian",
        placeOfIssue: ocrFallback.placeOfIssue || "",
        placeOfBirth: ocrFallback.placeOfBirth || "",
        issueDate: ocrFallback.issueDate || "",
        expiryDate: (mrzData?.expirationDate ? formatMrzDate(mrzData.expirationDate) : ocrFallback.expiryDate) || "",
        mrz: mrzText,
        rawText: text
      };

      if (!finalData.passportNumber && !finalData.firstName && !finalData.dateOfBirth) {
         throw new Error("Could not extract any meaningful fields from OCR text or MRZ. Please upload a clearer image.");
      }

      return finalData;
      
    } catch (error: any) {
      console.error('OCR Error Stack:', error.stack);
      return {
        success: false,
        error: error.message || "Unknown error",
        stack: error.stack
      };
    }
  }
}
