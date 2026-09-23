import { Body, Controller, Get, Ip, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { z } from '@ugcnp/shared';
import { Roles, Permissions } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { PaymentService } from '../payment/payment.service';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  role: z.enum(['CREATOR', 'BRAND', 'ADMIN', 'MANAGER', 'QA', 'FINANCE']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED']).optional(),
  q: z.string().optional().or(z.literal('')),
});

const campaignQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.string().optional().or(z.literal('')),
  q: z.string().optional().or(z.literal('')),
});

const statusSchema = z.object({ status: z.string().min(1).max(30) }).strict();
const roleSchema = z.object({ role: z.enum(['CREATOR', 'BRAND', 'ADMIN', 'MANAGER', 'QA', 'FINANCE']) }).strict();
const settingsSchema = z
  .object({
    commissionPercent: z.number().int().min(0).max(60).optional(),
    theme: z.object({ primaryColor: z.string(), accentColor: z.string(), logoUrl: z.string(), brandName: z.string() }).optional(),
    maintenanceMode: z.boolean().optional(),
    signupsOpen: z.boolean().optional(),
    emailFrom: z.string().email().optional(),
  })
  .partial();

const taskQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), status: z.string().optional() });
const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  assigneeId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});
const taskUpdateSchema = z.object({ status: z.string().optional(), title: z.string().optional(), priority: z.string().optional(), assigneeId: z.string().optional().nullable() });

const auditQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50), action: z.string().optional() });

@Controller('admin')
@Roles('ADMIN', 'MANAGER', 'QA', 'FINANCE')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
    private readonly payments: PaymentService,
  ) {}

  // users
  @Get('users')
  @Permissions('users.read')
  listUsers(@Query(new ZodValidationPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/status')
  @Permissions('users.write')
  setStatus(@CurrentUser() user: never, @Param('id') id: string, @Body(new ZodValidationPipe(statusSchema)) body: { status: string }, @Ip() ip: string) {
    return { data: this.admin.setUserStatus(user as never, id, body.status, ip) };
  }

  @Patch('users/:id/role')
  @Permissions('users.write')
  setRole(@CurrentUser() user: never, @Param('id') id: string, @Body(new ZodValidationPipe(roleSchema)) body: { role: string }, @Ip() ip: string) {
    return { data: this.admin.setUserRole(user as never, id, body.role, ip) };
  }

  // campaigns
  @Get('campaigns')
  @Permissions('campaigns.read')
  listCampaigns(@Query(new ZodValidationPipe(campaignQuery)) query: z.infer<typeof campaignQuery>) {
    return this.admin.listCampaigns(query);
  }

  @Get('payments')
  listPayments(@CurrentUser() user: never, @Query(new ZodValidationPipe(campaignQuery)) query: { page: number; limit: number; q?: string }) {
    return this.payments.list(user as never, 'all', query.page, query.limit);
  }

  // tasks
  @Get('tasks')
  @Permissions('tasks.read')
  listTasks(@Query(new ZodValidationPipe(taskQuery)) query: { page: number; limit: number; status?: string }) {
    return this.admin.listTasks(query);
  }

  @Post('tasks')
  @Permissions('tasks.write')
  createTask(@CurrentUser() user: never, @Body(new ZodValidationPipe(taskSchema)) body: z.infer<typeof taskSchema>) {
    return { data: this.admin.createTask(user as never, body as never) };
  }

  @Patch('tasks/:id')
  @Permissions('tasks.write')
  updateTask(@CurrentUser() user: never, @Param('id') id: string, @Body(new ZodValidationPipe(taskUpdateSchema)) body: z.infer<typeof taskUpdateSchema>) {
    return { data: this.admin.updateTask(user as never, id, body) };
  }

  // disputes
  @Get('disputes')
  listDisputes(@Query(new ZodValidationPipe(listQuery)) query: { page: number; limit: number }) {
    return this.admin.listDisputes(query.page, query.limit);
  }

  @Patch('disputes/:id/resolve')
  resolve(@CurrentUser() user: never, @Param('id') id: string, @Body() body: { resolution: string }) {
    return { data: this.admin.resolveDispute(user as never, id, body.resolution ?? 'Resolved') };
  }

  // reports / settings / audit
  @Get('reports/summary')
  @Permissions('reports.read')
  reports(@CurrentUser() user: never) {
    return { data: this.admin.reportsSummary(user as never) };
  }

  @Get('settings')
  @Permissions('settings.read')
  settings() {
    return { data: this.admin.getSettings() };
  }

  @Put('settings')
  @Permissions('settings.write')
  updateSettings(@CurrentUser() user: never, @Body(new ZodValidationPipe(settingsSchema)) body: z.infer<typeof settingsSchema>, @Ip() ip: string) {
    return { data: this.admin.updateSettings(user as never, body, ip) };
  }

  @Get('audit-logs')
  @Permissions('audit.read')
  auditLogs(@Query(new ZodValidationPipe(auditQuery)) query: { page: number; limit: number; action?: string }) {
    return { data: this.audit.list(query.page, query.limit, { action: query.action }) };
  }
}