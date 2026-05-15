import { Scale } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Scale className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Terms of Service</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: May 15, 2026</p>

        <div className="prose prose-invert max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-2">1. Agreement</h2>
            <p>These Terms of Service ("Terms") govern your use of the websites, mobile applications, and services operated by 13 Moon Forge / Ezekiel Evans (collectively, the "Services"). By using the Services, you agree to these Terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years old to use the Services. By using them, you confirm that you meet this requirement and that you have the legal authority to enter into this agreement.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for any activity under your account. Notify us immediately at <a href="mailto:eze@13moonforge.ai" className="text-primary underline">eze@13moonforge.ai</a> if you suspect unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">4. Acceptable use</h2>
            <p>You agree not to use the Services to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Violate any applicable law or the rights of others.</li>
              <li>Harass, threaten, or endanger any person.</li>
              <li>Post sexually explicit content involving minors, content depicting non-consensual violence, or content that incites real-world harm.</li>
              <li>Distribute malware, spam, or run automated systems that overload the Services.</li>
              <li>Attempt to circumvent the Book of Names integrity guarantees (e.g. by exploiting bugs to delete records).</li>
            </ul>
            <p>We may suspend access to specific features, throttle abusive accounts, or refer illegal activity to authorities. Per the Book of Names guarantee, we cannot remove a user's registry entry — but we can disable login.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">5. Your content</h2>
            <p>You retain ownership of the content you post, upload, or create on the Services. By posting content, you grant us a non-exclusive, royalty-free license to display, store, and transmit it as needed to operate the Services. You are responsible for the content you publish.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">6. Payments and subscriptions</h2>
            <p>Paid subscriptions and purchases for the Services are processed exclusively through the web at <a href="https://13moonforge.ai" className="text-primary underline" target="_blank" rel="noreferrer">13moonforge.ai</a> and related sites, via Square and Coinbase Commerce. Mobile applications are reader/companion software and do not process payments. All sales are final unless required otherwise by law. Refund requests may be sent to <a href="mailto:eze@13moonforge.ai" className="text-primary underline">eze@13moonforge.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">7. Termination</h2>
            <p>You may stop using the Services at any time. We may suspend or restrict access if you violate these Terms. As noted in the Privacy Policy, registry entries in the Book of Names cannot be deleted, but you may request that we disable your account's login access.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">8. Disclaimer</h2>
            <p>The Services are provided "as is" without warranties of any kind. We make no guarantee of uninterrupted availability, error-free operation, or fitness for a particular purpose. Use at your own risk.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">9. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, 13 Moon Forge and its operator will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">10. Governing law</h2>
            <p>These Terms are governed by the laws of the United States and the state of the operator's primary residence, without regard to conflict-of-law principles.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">11. Changes</h2>
            <p>We may update these Terms. The "Last updated" date above will reflect the most recent change. Continued use of the Services after a change means you accept the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">12. Contact</h2>
            <p>Questions: <a href="mailto:eze@13moonforge.ai" className="text-primary underline">eze@13moonforge.ai</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
