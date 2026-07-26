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
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-extrabold text-navy">Privacy Policy</h1>
        <div className="space-y-8 rounded-2xl bg-white p-8 shadow-sm text-gray-700 leading-relaxed">
          <p className="text-sm text-gray-400">Last Updated: January 2026</p>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">1. Introduction</h2>
            <p>
              Fair Fight ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Fair Fight is an educational platform — we are not a law firm, and we do not provide legal advice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">2. Information We Collect</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and authentication credentials through Clerk (our authentication provider).</li>
              <li><strong>Case Information:</strong> When you create cases, we collect the information you provide about your legal situation, including case descriptions, evidence tags, timeline entries, and calendar events.</li>
              <li><strong>AI Interactions:</strong> When you use our AI features, we process the questions and information you submit to generate educational responses. These interactions may be logged for quality improvement.</li>
              <li><strong>Usage Data:</strong> We automatically collect information about how you interact with our site, including pages visited, features used, and time spent on the platform.</li>
              <li><strong>Payment Information:</strong> If you purchase Fair Fight Pro, Stripe processes your payment. We do not store your full credit card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>To provide, maintain, and improve our educational platform</li>
              <li>To generate AI-powered legal education responses based on your inputs</li>
              <li>To process payments for Fair Fight Pro subscriptions</li>
              <li>To communicate with you about your account and our services</li>
              <li>To analyze usage patterns and improve user experience</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">4. Data Sharing</h2>
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
            <h2 className="mb-3 text-xl font-bold text-navy">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your data at any time through our Data Request page or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">7. Your Rights</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Access:</strong> You can request a copy of your personal data</li>
              <li><strong>Correction:</strong> You can update inaccurate information</li>
              <li><strong>Deletion:</strong> You can request deletion of your data</li>
              <li><strong>Export:</strong> You can export your data in a portable format</li>
              <li><strong>Opt-out:</strong> You can opt out of marketing communications</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, visit our <a href="/data-request" className="text-gold hover:underline">Data Request page</a> or contact us at privacy@fairfight.ai.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">8. AI Data Processing</h2>
            <p>
              When you use our AI features, your inputs are transmitted to Google's Gemini API for processing. Google does not use your data to train its models. AI-generated responses are for educational purposes only and do not constitute legal advice. Always consult a licensed attorney for legal advice specific to your situation.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-navy">9. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at privacy@fairfight.ai or through our Data Request page.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
