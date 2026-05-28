# Jetpace Energy EMS — Project Notes

## Pending: Email Setup (SendGrid)

The current email setup uses the `node-red-node-email` package with Gmail SMTP (`email_out` node).
This requires an **App Password** from Google, which can be tricky to configure.

A better alternative is **SendGrid** via the REST API — free (100 emails/day), no SMTP or app password needed.

### When ready to switch, do the following:

#### Step 1 — Create a SendGrid account
1. Sign up at https://sendgrid.com (free, no credit card required)
2. Go to **Settings → Sender Authentication** and verify your sender email address
3. Go to **Settings → API Keys → Create API Key** (select "Restricted Access" → enable "Mail Send" only)
4. Copy the API key — it is shown only once

#### Step 2 — Replace `email_out` node in flows.json

Delete the existing `email_out` node (type: `e-mail`) and replace with two nodes:

**Node 1 — Function node** (`Build SendGrid Request`):
```javascript
var toEmail = msg.to;
var subject = msg.topic;
var htmlBody = msg.payload;

msg.method = "POST";
msg.url = "https://api.sendgrid.com/v3/mail/send";
msg.headers = {
    "Authorization": "Bearer YOUR_SENDGRID_API_KEY",
    "Content-Type": "application/json"
};
msg.payload = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: "your-verified-sender@example.com" },
    subject: subject,
    content: [{ type: "text/html", value: htmlBody }]
};
return msg;
```

**Node 2 — HTTP Request node** (`SendGrid API`):
- Method: `use msg.method`
- URL: leave blank (uses `msg.url`)
- Return: plain text

Wire: `fn_format_email_html` output 1 → `Build SendGrid Request` → `SendGrid API`

#### Step 3 — Update wires in `fn_format_email_html`
Change output 1 wire from `email_out` to the new `Build SendGrid Request` function node.

### Notes
- The sender email address can be changed anytime by editing the `from` field in the function node — just ensure the new address is verified in SendGrid first.
- SendGrid free tier: 100 emails/day, no expiry.
- The email body is sent as `text/html` (full HTML report).
