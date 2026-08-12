import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Fair Fight" },
      { name: "description", content: "Fair Fight privacy policy — how we collect, use, and protect your data." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-navy px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-extrabold text-white">Privacy Policy</h1>
        <div className="space-y-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 text-white/80 leading-relaxed">
          <p className="text-sm text-white/40">Last Updated: January 2026</p>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">1. Introduction</h2>
            <p>
              Fair Fight ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Fair Fight is an educational platform — we are not a law firm, and we do not provide legal advice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">2. Information We Collect</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and authentication credentials through Clerk (our authentication provider).</li>
              <li><strong>Case Information:</strong> When you create cases, we collect the information you provide about your legal situation, including case descriptions, evidence tags, timeline entries, and calendar events.</li>
              <li><strong>AI Interactions:</strong> When you use our AI features, we process the questions and information you submit to generate educational responses. These interactions may be logged for quality improvement.</li>
              <li><strong>Usage Data:</strong> We automatically collect information about how you interact with our site, including pages visited, features used, and time spent on the platform.</li>
              <li><strong>Payment Information:</strong> Paid Pro features are not currently accepting payments while we finish verification. If and when payments resume, Stripe processes them and we do not store your full credit card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>To provide, maintain, and improve our educational platform</li>
              <li>To generate AI-powered legal education responses based on your inputs</li>
              <li>To process payments for Fair Fight Pro (one-time, per case) if and when paid features resume</li>
              <li>To communicate with you about your account and our services</li>
              <li>To analyze usage patterns and improve user experience</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">4. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Clerk:</strong> For authentication and user management</li>
              <li><strong>Google (Gemini API):</strong> For AI-powered analysis — your inputs are processed to generate educational responses</li>
              <li><strong>Stripe:</strong> For payment processing</li>
              <li><strong>Neon:</strong> For database hosting</li>
              <li><strong>Legal Requirements:</strong> If required by law, court order, or government request</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide services. Self-serve export and deletion tools are temporarily unavailable while we verify they cover every category of data we hold. Contact us at privacy@fairfight.ctonew.app and we will assist with access, export, or deletion requests.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">7. Your Rights</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Access:</strong> You can request a copy of your personal data</li>
              <li><strong>Correction:</strong> You can update inaccurate information</li>
              <li><strong>Deletion:</strong> You have the right to request deletion of your data. The in-app self-serve deletion tool is temporarily unavailable while we verify it covers all data we hold (including uploaded files and payment records); contact us and we will assist.</li>
              <li><strong>Export:</strong> You have the right to export your data in a portable format. The in-app self-serve export tool is temporarily unavailable while we verify it includes all data; contact us and we will assist.</li>
              <li><strong>Opt-out:</strong> You can opt out of marketing communications</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, visit our <a href="/data-request" className="text-gold hover:underline">Data Request page</a> or contact us at privacy@fairfight.ctonew.app.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">8. AI Data Processing</h2>
            <p>
              When you use our AI features, your inputs are transmitted to Google's Gemini API for processing. Google does not use your data to train its models. AI-generated responses are for educational purposes only and do not constitute legal advice. Always consult a licensed attorney for legal advice specific to your situation.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-white">9. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at privacy@fairfight.ctonew.app or through our Data Request page.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
