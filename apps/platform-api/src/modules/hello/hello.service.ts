import { Service } from '@rx-ted/packages-honest';
import type { HelloRequestDto } from './hello.dto';

@Service()
class HelloService {
  greet(username?: string) {
    const name = username || 'World';
    return { message: `Hello, ${name}!`, status: 200 };
  }

  create(dto: HelloRequestDto) {
    const repeat = dto.repeat ?? 1;
    const message = Array.from({ length: repeat }, () => `Hello, ${dto.name}!`).join(' ');
    return { id: 1, ...dto, message };
  }

  update(id: number, dto: Partial<HelloRequestDto>) {
    return { id, ...dto, message: `Updated ${dto.name ?? 'resource'} #${id}` };
  }

  remove(id: number) {
    return { deleted: true, id };
  }

  options() {
    return { allow: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] };
  }
}

export default HelloService;
