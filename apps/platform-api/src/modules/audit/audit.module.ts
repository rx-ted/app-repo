import { Module } from '@rx-ted/packages-honest';
import { AuditController } from '@/modules/audit/audit.controller';
import { AuditService } from '@/modules/audit/audit.service';

@Module({
  controllers: [AuditController],
  services: [AuditService],
})
export class AuditModule {}

export default AuditModule;
