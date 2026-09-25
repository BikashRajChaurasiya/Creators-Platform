'use client';

import { LegalShell, LegalBlock } from '@/components/home/legal-shell';

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy" updated="September 25, 2026">
      <LegalBlock
        heading="1. Information we collect"
        body={
          <>
            <p>
              We collect the information you provide when you create an account and use the platform: your name, email
              address, phone number, role (creator or brand), profile details, portfolio and uploads, campaign and
              application data, and payout information you add for receiving payments.
            </p>
            <p>
              We also collect technical data such as IP address and browser information to secure the platform and
              detect abuse.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="2. How we use your information"
        body={
          <>
            <p>We use your information to operate the platform, including:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Verifying your identity via email OTP and processing your account.</li>
              <li>Connecting brands and creators for campaigns and applications.</li>
              <li>Processing and recording payments through our operator-approved pipeline.</li>
              <li>Resolving disputes, providing support and meeting legal obligations.</li>
            </ul>
          </>
        }
      />
      <LegalBlock
        heading="3. Data sharing"
        body={
          <>
            <p>
              We share your data only where necessary: brand and creator profile information is visible within the
              marketplace; payout details are shared with our finance operators and payment providers solely to
              disburse funds; and we may share data with regulators or law enforcement when required by law.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="4. Security"
        body={
          <>
            <p>
              Passwords are hashed with Argon2, verification codes are stored as hashes, and financial operations
              follow a maker–checker approval flow. No system is fully immune to attack, but we apply industry-standard
              safeguards.
            </p>
          </>
        }
      />
      <LegalBlock
        heading="5. Your rights"
        body={
          <>
            <p>
              You may access, correct or request deletion of your personal data, and you can close your account at any
              time. Contact us at hello@ugcnp.com to exercise these rights.
            </p>
          </>
        }
      />
    </LegalShell>
  );
}