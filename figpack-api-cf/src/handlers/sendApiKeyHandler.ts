import { Env, RateLimitResult } from '../types';
import { json } from '../utils';
import { Resend } from 'resend';

/**
 * Handler for sending API key via email
 * This endpoint is heavily rate-limited to prevent abuse
 */
export async function handleSendApiKey(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { email } = body;

		if (!email || typeof email !== 'string') {
			return json({ success: false, message: 'Email is required' }, 400);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json({ success: false, message: 'Invalid email format' }, 400);
		}

		// Check if user exists
		const user = await env.figpack_db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

		if (!user) {
			// User doesn't exist - for security, we don't reveal this explicitly to prevent user enumeration
			// But we'll still return success to avoid leaking information
			return json(
				{
					success: true,
					message: 'If an account exists with this email, the API key has been sent.',
				},
				200,
				{
					'X-RateLimit-Limit': '3',
					'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
					'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
				},
			);
		}

		const apiKey = user.api_key as string;
		const userName = user.name as string;

		// Initialize Resend
		const resend = new Resend(env.RESEND_API_KEY);

		// Send email with API key
		await resend.emails.send({
			from: 'noreply@figpack.org',
			to: email,
			subject: 'Your Figpack API Key',
			html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Your Figpack API Key</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
		<h1 style="color: #2c3e50; margin-top: 0;">Your Figpack API Key</h1>
		<p>Hello ${userName},</p>
		<p>You requested your Figpack API key. Here it is:</p>
		<div style="background-color: #fff; border: 2px solid #e9ecef; border-radius: 4px; padding: 16px; margin: 20px 0; font-family: 'Courier New', monospace; font-size: 14px; word-break: break-all;">
			<strong>${apiKey}</strong>
		</div>
		<p style="color: #dc3545; font-weight: bold;">⚠️ Security Notice:</p>
		<ul style="color: #6c757d;">
			<li>Keep this API key secure and do not share it with anyone</li>
			<li>Do not commit this key to version control systems</li>
			<li>If you believe your API key has been compromised, regenerate it immediately</li>
		</ul>
		<p>If you did not request this email, please contact support immediately.</p>
	</div>
	<div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 24px;">
		<p>This is an automated message from Figpack. Please do not reply to this email.</p>
		<p>&copy; ${new Date().getFullYear()} Figpack. All rights reserved.</p>
	</div>
</body>
</html>
			`,
		});

		return json(
			{
				success: true,
				message: 'If an account exists with this email, the API key has been sent.',
			},
			200,
			{
				'X-RateLimit-Limit': '3',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (err) {
		console.error('Error sending API key:', err);
		return json({ success: false, message: 'Failed to send API key. Please try again later.' }, 500);
	}
}
