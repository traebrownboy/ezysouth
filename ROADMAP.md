# EzySouth Development Roadmap

Last updated: 18 October 2026

This roadmap tracks proposed improvements, not promises of release dates or features already live. EzySouth is currently in public beta; stability and real-business feedback take priority over risky changes.

## Current priority: Keep the public beta reliable
- Protect existing website publishing, published URLs, cloud projects and live JobFlow enquiries.
- Gather user feedback, fix defects and simplify onboarding before major feature rollouts.

## Planned: JobFlow quoting and customer communications
**Status:** Discovery / planned (not yet implemented)  
**Tracked work:** [Issue #3: Automated quotes, email, SMS and customer replies](https://github.com/traebrownboy/ezysouth/issues/3)

Help a business respond to incoming quote requests within JobFlow instead of switching apps.

1. **First release:** Compose and approve customer quotes linked to existing JobFlow enquiries; send verified transactional emails and record send status.
2. **Next:** Opt-in SMS notifications and secure quote links (only after NZ provider, pricing and sending/reply capabilities are tested).
3. **Then:** Customer quote page to accept, decline or request changes, syncing decisions to JobFlow.
4. **Later:** Configurable and compliant reminders for unanswered quotes, with opt-outs, deduplication and cost limits.

**Build rules:** Business-specific access controls, secure backend delivery, no provider secrets in browser code, explicit owner approval before any price is sent, privacy/security reviews, and no disruption to the beta.

**Owner input required before activation:** Decide whether to start email-first, access/control a sending domain's DNS, create and verify delivery-provider account(s), approve any paid usage and costs, approve message wording and provide consented test contacts. All API keys go into protected environment secrets, never GitHub or chat.

**Release gate:** Proven end-to-end delivery with real status feedback; tenant isolation and access tested; no regressions to existing sites and JobFlow.

## Working principles
- No live sends or paid external services are enabled merely by placing an idea on the roadmap.
- Keep beta/pilot functionality clearly labeled and turn new features on for testers explicitly.
- Revisit priorities using actual customer feedback.
