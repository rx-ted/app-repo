#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('Usage: pnpm gen:module <module-name>');
  process.exit(1);
}

const baseDir = path.join(process.cwd(), 'src', 'modules', moduleName);

const directories = ['', 'dtos', 'repositories', 'mappers', 'entities'];

const files = {
  [`${moduleName}.module.ts`]: `import { Module } from '@rx-ted/packages-honest';

@Module({
  imports: [],  
  controllers: [],
  services: [],
})
export class ${pascal(moduleName)}Module {}
`,
  [`${moduleName}.controller.ts`]: `import { Controller, Get } from '@rx-ted/packages-honest';
import { ${pascal(moduleName)}Service } from './${moduleName}.service';

@Controller('/${moduleName}')
export class ${pascal(moduleName)}Controller {
  constructor(
    private readonly ${camel(moduleName)}Service: ${pascal(moduleName)}Service
  ) {}

  @Get('/')
  async findAll() {
    return this.${camel(moduleName)}Service.findAll();
  }
}
`,
  [`${moduleName}.service.ts`]: `import { Service } from '@rx-ted/packages-honest';

@Service()
export class ${pascal(moduleName)}Service {
  async findAll() {
    return [];
  }
}
`,
  [`dtos/${moduleName}.request.dto.ts`]: `export class ${pascal(moduleName)}RequestDto {}
`,
  [`dtos/${moduleName}.response.dto.ts`]: `export class ${pascal(moduleName)}ResponseDto {}
`,
  [`dtos/${moduleName}.command.dto.ts`]: `export class ${pascal(moduleName)}CommandDto {}
`,
  [`dtos/${moduleName}.query.dto.ts`]: `export class ${pascal(moduleName)}QueryDto {}
`,
  [`repositories/${moduleName}.repository.ts`]: `export class ${pascal(moduleName)}Repository {}
`,
  [`mappers/${moduleName}.mapper.ts`]: `export class ${pascal(moduleName)}Mapper {}
`,
  [`entities/${moduleName}.entity.ts`]: `export class ${pascal(moduleName)}Entity {}
`,
};

for (const dir of directories) {
  fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
}

for (const [file, content] of Object.entries(files)) {
  const filePath = path.join(baseDir, file);
  fs.writeFileSync(filePath, content, 'utf-8');
}

console.log(`✅ Module '${moduleName}' created at src/modules/${moduleName}`);

function pascal(str) {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function camel(str) {
  const p = pascal(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}
