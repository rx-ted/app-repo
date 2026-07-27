import { Service } from '@rx-ted/packages-honest';

@Service()
class HelloService {
  greet(username?: string) {
    const name = username || 'World';
    return { message: `Hello, ${name}!` };
  }
}

export default HelloService;
