import PageShell, { LegalSection } from '../components/legal/PageShell';

export default function Privacy() {
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: August 2026">
      <LegalSection title="Overview">
        <p>
          PDFNexus is built around one principle: your documents belong to you. All PDF
          processing — merging, splitting, converting and e-signing — happens entirely in
          your browser, so your unprocessed files never leave your device.
        </p>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <p>
          When you create an account we collect your email address and display name. When
          you choose to save a document to the cloud, we store the file itself along with
          metadata such as file name, size, and the date it was saved.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <p>
          We use your information solely to operate your account, provide cloud storage,
          and keep the service secure. We do not sell, rent, or share your personal data
          or your documents with third parties for marketing purposes.
        </p>
      </LegalSection>

      <LegalSection title="Cloud Storage & Retention">
        <p>
          Saved documents live in your private, per-user storage bucket protected by
          strict Row Level Security policies. You can download or permanently delete any
          document from your workspace at any time; deleted files are removed from our
          systems.
        </p>
      </LegalSection>

      <LegalSection title="Data Security">
        <p>
          All traffic is encrypted in transit using TLS, and stored files are encrypted at
          rest. Access to your data is scoped to your account through per-user security
          policies enforced at the database level.
        </p>
      </LegalSection>

      <LegalSection title="Your Rights">
        <p>
          You may access, export, or delete your data at any time from your account
          workspace. You may also contact us directly and we will action your request
          within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="Changes to This Policy">
        <p>
          We may update this policy from time to time. Material changes will be announced
          on this page, and your continued use of the service after changes take effect
          constitutes acceptance of the revised policy.
        </p>
      </LegalSection>
    </PageShell>
  );
}