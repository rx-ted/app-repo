import { Module } from '@rx-ted/packages-honest';
import OutboxService from '@/modules/outbox/outbox.service';
import OutboxProcessorService from '@/modules/outbox/outbox-processor.service';

@Module({ services: [OutboxService, OutboxProcessorService] })
class OutboxModule {}
export default OutboxModule;
