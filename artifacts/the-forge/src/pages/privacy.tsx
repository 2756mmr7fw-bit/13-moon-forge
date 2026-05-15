import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Privacy Policy</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: May 15, 2026</p>

        <div className="prose prose-invert max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-2">Who we are</h2>
            <p>
              13 Moon Forge ("we," "us," or "our") is a software ecosystem operated by Ezekiel Evans. This policy covers the 13 Moon Forge website, The People's Town Square, EzQuill, the 13 Moon Film Editor, the 13 Moon Forge mobile app, and any associated services (collectively, the "Services").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">Information we collect</h2>
            <p>We collect the minimum information required to operate the Services:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account information</strong> — your email address and a username when you create an account (via Clerk).</li>
              <li><strong>Content you submit</strong> — posts, documents, projects, and other content you create within the Services.</li>
              <li><strong>Technical data</strong> — IP address, device type, browser, and basic usage logs needed for security and reliability.</li>
              <li><strong>Payment data</strong> — handled entirely by third-party processors (Square, Coinbase Commerce). We never see or store your full card number.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">What we do with it</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Operate, maintain, and improve the Services.</li>
              <li>Authenticate you and protect against abuse.</li>
              <li>Send transactional emails you've explicitly opted into (welcome emails, password resets, receipts).</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> sell your data, share it with advertisers, or use it for behavioral targeting. There is no advertising network on any of our Services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">The Book of Names (delete-proof archive)</h2>
            <p>
              The People's Town Square maintains a member registry called the Book of Names. By design and by database-level enforcement, records in this registry cannot be deleted by anyone — including us. If you wish to stop using the service, your account can be deactivated, but your registry entry (consisting of your email at signup, your chosen first name, and the timestamp of your arrival) remains as a permanent record. This is the platform's foundational guarantee.
            </p>
            <p>If you do not consent to this permanent record, please do not register for The People's Town Square. Our other Services do not have this characteristic and operate under normal data-handling rules.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">Third parties we use</h2>
            <p>We use a small set of trusted vendors to run the Services. Each has its own privacy policy:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><a href="https://clerk.com/privacy" className="text-primary underline" target="_blank" rel="noreferrer">Clerk</a> — authentication and account management.</li>
              <li><a href="https://resend.com/legal/privacy-policy" className="text-primary underline" target="_blank" rel="noreferrer">Resend</a> and <a href="https://www.twilio.com/en-us/legal/privacy" className="text-primary underline" target="_blank" rel="noreferrer">SendGrid</a> — transactional email delivery.</li>
              <li><a href="https://squareup.com/us/en/legal/general/privacy" className="text-primary underline" target="_blank" rel="noreferrer">Square</a> and <a href="https://www.coinbase.com/legal/privacy" className="text-primary underline" target="_blank" rel="noreferrer">Coinbase Commerce</a> — payment processing.</li>
              <li><a href="https://www.cloudflare.com/privacypolicy/" className="text-primary underline" target="_blank" rel="noreferrer">Cloudflare</a> — DNS and DDoS protection.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">Mobile app specifics</h2>
            <p>
              The 13 Moon Forge mobile app is a reader/companion application. It does not collect device contacts, location, microphone, camera, or photo library data unless you explicitly grant a permission for a specific feature. It does not use third-party advertising SDKs. It does not track you across other apps or websites — the iOS permission prompt that mentions tracking is required by Apple even when no tracking occurs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">Children's privacy</h2>
            <p>The Services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, contact us and we will remove it.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">Your rights</h2>
            <p>You may access, correct, export, or request deletion of your personal data (subject to the Book of Names exception described above) by contacting us at <a href="mailto:eze@13moonforge.ai" className="text-primary underline">eze@13moonforge.ai</a>. We respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">Changes to this policy</h2>
            <p>If we update this policy materially, we will post the new version here and update the "Last updated" date above. Continued use after a change means you accept the updated policy.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-2">Contact</h2>
            <p>Questions or requests: <a href="mailto:eze@13moonforge.ai" className="text-primary underline">eze@13moonforge.ai</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
