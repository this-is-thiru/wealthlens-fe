import express, { Request, Response } from 'express';
import { join } from 'node:path';

const app = express();
const distFolder = join(process.cwd(), 'dist/browser');

// Disable X-Powered-By header to avoid disclosing framework information (CWE-200)
app.disable('x-powered-by');

// Serve static files
app.use(express.static(distFolder));

// All other routes serve index.html
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(join(distFolder, 'index.html'));
  });

  // Start server
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`CSR Angular app running at http://localhost:${port}`);
  });
