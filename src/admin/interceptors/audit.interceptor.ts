import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AdminService } from '../admin.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly adminService: AdminService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, user } = request;

        // Only log mutation requests for admin routes
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && url.includes('/admin')) {
            return next.handle().pipe(
                tap(async () => {
                    if (user) {
                        try {
                            await this.adminService.createAuditLog({
                                action: `${method} ${url}`,
                                performedBy: user.email || user.sub,
                                targetId: body?.id || request.params?.id,
                                details: {
                                    body,
                                    params: request.params,
                                    query: request.query,
                                },
                            });
                        } catch (error) {
                            console.error('Failed to create audit log:', error);
                        }
                    }
                }),
            );
        }

        return next.handle();
    }
}
