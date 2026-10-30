import { Module } from '@rx-ted/packages-honest';
import OutboxService from '@/modules/outbox/outbox.service';

@Module({ services: [OutboxService] })
class OutboxModule {}
export default OutboxModule;
