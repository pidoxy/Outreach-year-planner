import {spawnSync} from 'node:child_process';
import path from 'node:path';
const cli=path.resolve('node_modules/.bin/wrangler');
for(const [cmd,args,options] of [
 [process.execPath,['scripts/build-pages.mjs'],{}],
 [cli,['deploy'],{}],
 [cli,['pages','deploy','--project-name','outreach-year-planner','--branch','main'],{cwd:'pages-site'}]
]){const result=spawnSync(cmd,args,{stdio:'inherit',...options});if(result.status!==0)process.exit(result.status||1)}
