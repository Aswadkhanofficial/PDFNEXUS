import PageShell, { LegalSection } from '../components/legal/PageShell';

export default function Terms() {
  return (
    <PageShell title="Terms of Service" subtitle="Last updated: August 2026">
      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using PDFNexus you agree to be bound by these Terms of Service.
          If you do not agree to any part of these terms, you may not use the service.
        </p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          PDFNexus provides browser-based PDF utilities including merging, splitting,
          image-to-PDF conversion, and e-signing, plus optional cloud storage for saved
          documents. Processing is performed client-side; we do not inspect the contents
          of your documents.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts">
        <p>
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activity that occurs under your account. You must
          provide accurate information when creating an account.
        </p>
      </LegalSection>

      <LegalSection title="4. Free Tier & Premium">
        <p>
          Free accounts may process a limited number of documents per tool. Premium plans
          remove these limits. Trial periods, when offered, are subject to the terms
          presented at activation and may be cancelled at any time before they convert.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>
          You agree not to use the service to store or process unlawful material, to
          infringe the intellectual property rights of others, or to attempt to gain
          unauthorized access to any part of the service or other users' data.
        </p>
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
        <p>
          The PDFNexus name, logo, and service design are our property. You retain full
          ownership of the documents you process and store through the service.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of Liability">
        <p>
          The service is provided "as is" without warranties of any kind. To the maximum
          extent permitted by law, PDFNexus shall not be liable for indirect, incidental,
          or consequential damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to These Terms">
        <p>
          We may revise these terms at any time. Updated terms will be posted on this
          page along with the effective date, and continued use of the service constitutes
          acceptance of the revised terms.
        </p>
      </LegalSection>
    </PageShell>
  );
}