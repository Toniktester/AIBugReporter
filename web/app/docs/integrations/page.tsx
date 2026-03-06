import Link from 'next/link'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'
import styles from './page.module.css'

export default function IntegrationsDocs() {
    return (
        <div className={styles.layout}>
            <header className={styles.topbar}>
                <div className={styles.headerLeft}>
                    <Link href="/settings" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Back to Settings
                    </Link>
                    <h1><BookOpen size={28} className={styles.titleIcon} /> Integration Documentation</h1>
                </div>
            </header>

            <main className={styles.mainContent}>
                <section className={`${styles.docSection} glass`}>
                    <h2>1. Jira Integration (REST API)</h2>
                    <p>Connect your AI Reporter to Jira to automatically create detailed tickets with attached screenshots whenever a new bug is logged.</p>

                    <h3>How to generate an API Token</h3>
                    <ol>
                        <li>Log in to your Atlassian account at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer">id.atlassian.com <ExternalLink size={12} /></a>.</li>
                        <li>Click <strong>Create API token</strong>.</li>
                        <li>Give it a memorable label (e.g. "AI Bug Reporter") and click Create.</li>
                        <li>Copy the token to your clipboard immediately (you cannot view it again).</li>
                    </ol>

                    <h3>Configuration in Settings</h3>
                    <ul>
                        <li><strong>Jira Domain:</strong> The subdomain part of your Jira URL (e.g., for <code>acme.atlassian.net</code>, enter <code>acme</code>).</li>
                        <li><strong>Atlassian Email:</strong> The email address associated with the account that generated the API token.</li>
                        <li><strong>Jira API Token:</strong> The token you copied in the previous step.</li>
                        <li><strong>Default Project Key:</strong> The 2-4 letter prefix of your project issues (e.g., <code>PROJ</code>, <code>WEB</code>).</li>
                    </ul>

                    <h3>Flow</h3>
                    <p>When you submit a bug, the app makes a POST request to <code>/rest/api/3/issue</code>. It will also upload any screenshots directly to the newly created issue using a multipart file upload to the Jira attachments endpoint.</p>
                </section>

                <section className={`${styles.docSection} glass`}>
                    <h2>2. Microsoft Teams Integration</h2>
                    <p>Push instant notifications, complete with actionable summary cards, into any designated Teams Channel.</p>

                    <h3>How to set up a Teams Webhook</h3>
                    <ol>
                        <li>Open Microsoft Teams and navigate to the channel where you want bug alerts.</li>
                        <li>Click the <code>...</code> (More options) next to the channel name.</li>
                        <li>Select <strong>Workflows</strong> (or Connectors).</li>
                        <li>Search for <strong>Incoming Webhook</strong> and click Add.</li>
                        <li>Give the Webhook a name (e.g. "Bug Alerts") and upload an icon if desired.</li>
                        <li>Click Create and copy the generated <strong>Webhook URL</strong>.</li>
                    </ol>
                    <p>Paste this URL into the Teams Configuration input on your Settings page. The AI Reporter formats passing data using standard MessageCard JSON designed for Teams webhook consumption.</p>
                </section>

                <section className={`${styles.docSection} glass`}>
                    <h2>3. Microsoft Outlook Integration</h2>
                    <p>Since Outlook does not support native direct webhooks like Slack or Teams, you can use Power Automate to bridge the connection and send actionable emails.</p>

                    <h3>How to set up a Power Automate Flow</h3>
                    <ol>
                        <li>Go to <a href="https://make.powerautomate.com" target="_blank" rel="noreferrer">Power Automate <ExternalLink size={12} /></a>.</li>
                        <li>Create an <strong>Instant cloud flow</strong>.</li>
                        <li>Select the Trigger: <strong>"When an HTTP request is received"</strong>.</li>
                        <li>Add an Action: <strong>"Send an email (V2) - Office 365 Outlook"</strong>.</li>
                        <li>Map the HTTP request body variables (like Summary, Severity) into the email body block.</li>
                        <li>Save the flow. The trigger block will now prominently display an <strong>HTTP POST URL</strong>.</li>
                    </ol>
                    <p>Paste this auto-generated HTTP POST URL into the Outlook Configuration input on your Settings page.</p>
                </section>

            </main>
        </div>
    )
}
