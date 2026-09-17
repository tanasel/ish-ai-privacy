# ISH AI Privacy

Browser-only tool that finds and removes personal details from text before staff paste it into an AI service.
No server-side processing, no uploads, no storage. See SECURITY.md for how to verify a release and CONTRACT.md for the module contract.

Build: `npm ci && npm run build`. Verify a checkout against the published record: `npm run build:verify`. Tests: `npm run test:all` (needs Playwright browsers).

The tool reduces disclosure. It does not prove anonymity or make a workflow GDPR compliant; that decision belongs to the school as controller.
