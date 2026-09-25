'use client';

import { LegalShell, LegalBlock } from '@/components/home/legal-shell';

export default function TermsPage() {
  return (
    <LegalShell title="Terms of service" updated="September 25, 2026">
      <LegalBlock
        heading="1. Acceptance of terms"
        body={
          <>
            <p>
              By creating an account or using the platform you agree to these terms. If you do not agree, do not use
              the service.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="2. Accounts"
        body={
          <>
            <p>
              You must provide accurate information when registering. You are responsible for keeping your credentials
              confidential and for everything done through your account. You must be the person you claim to be; brand
              and creator profiles are subject to verification.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="3. Platform conduct"
        body={
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Do not misrepresent your identity, audience or engagement metrics.</li>
              <li>Do not use the platform for unlawful, deceptive or fraudulent activity.</li>
              <li>Do not attempt to access, manipulate or abuse the payment pipeline outside the approved flow.</li>
              <li>Do not harass other users or post content that violates others&apos; rights.</li>
            </ul>
          </>
        }
      />
      <LegalBlock
        heading="4. Campaigns, deliverables & payments"
        body={
          <>
            <p>
              Campaign terms, deliverables and fees are agreed between brands and creators within the platform. The
              platform facilitates campaign management and payment processing. All payments move through our
              operator-reviewed maker–checker pipeline; the platform may hold, correct or reverse payments where a
              dispute or error is found.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="5. Disputes"
        body={
          <>
            <p>
              Creators and brands may raise disputes through the platform. Our team responds to first response within
              24 hours and aims to resolve cases within 7 days under our dispute SLA.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="6. Liability"
        body={
          <>
            <p>
              The platform is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, we disclaim
              warranties and are not liable for indirect or consequential damages arising from your use of the
              service.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="7. Changes & contact"
        body={
          <>
            <p>
              We may update these terms from time to time. Continued use after changes constitutes acceptance. Questions
              about these terms can be sent to hello@ugcnp.com.
            </p>
          </>
        }
      />
    </LegalShell>
  );
}