import { Env, RateLimitResult } from '../types';
import { json, generateApiKey, normalizeEmail } from '../utils';
import { Resend } from 'resend';

/**
 * Handler for requesting a new account
 * This endpoint is heavily rate-limited to prevent abuse
 * Requires a valid access code to automatically create an account
 */
export async function handleRequestAccount(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { email, name, researchDescription, accessCode } = body;

		// Validate required fields
		if (!email || typeof email !== 'string') {
			return json({ success: false, message: 'Email is required' }, 400);
		}

		if (!name || typeof name !== 'string') {
			return json({ success: false, message: 'Name is required' }, 400);
		}

		if (!researchDescription || typeof researchDescription !== 'string') {
			return json({ success: false, message: 'Research description is required' }, 400);
		}

		if (!accessCode || typeof accessCode !== 'string') {
			return json({ success: false, message: 'Access code is required' }, 400);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json({ success: false, message: 'Invalid email format' }, 400);
		}

		// Validate name length
		if (name.trim().length < 2) {
			return json({ success: false, message: 'Name must be at least 2 characters' }, 400);
		}

		if (name.trim().length > 200) {
			return json({ success: false, message: 'Name must be less than 200 characters' }, 400);
		}

		// Validate research description length
		if (researchDescription.trim().length < 10) {
			return json({ success: false, message: 'Research description must be at least 10 characters' }, 400);
		}

		if (researchDescription.trim().length > 2000) {
			return json({ success: false, message: 'Research description must be less than 2000 characters' }, 400);
		}

		// Validate access code
		const validAccessCodes = env.NEW_ACCOUNT_ACCESS_CODES ? env.NEW_ACCOUNT_ACCESS_CODES.split(',').map((code) => code.trim()) : [];

		if (!validAccessCodes.includes(accessCode.trim())) {
			return json({ success: false, message: 'Invalid access code. Please contact the authors to obtain a valid access code.' }, 403, {
				'X-RateLimit-Limit': '3',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			});
		}

		const normalizedEmail = normalizeEmail(email);

		// Check if user already exists
		const existingUser = await env.figpack_db.prepare('SELECT email FROM users WHERE email = ?').bind(normalizedEmail).first();

		if (existingUser) {
			return json(
				{ success: false, message: 'An account with this email already exists. Please use "Forgot API Key" to retrieve your API key.' },
				409,
				{
					'X-RateLimit-Limit': '3',
					'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
					'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
				},
			);
		}

		// Generate API key
		const apiKey = generateApiKey();
		const now = Date.now();

		// Create new user account
		await env.figpack_db
			.prepare(
				`INSERT INTO users (email, name, research_description, api_key, is_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
			)
			.bind(normalizedEmail, name.trim(), researchDescription.trim(), apiKey, now, now)
			.run();

		// Initialize Resend
		const resend = new Resend(env.RESEND_API_KEY);

		// Send welcome email to the new user
		try {
			await resend.emails.send({
				from: 'noreply@figpack.org',
				to: normalizedEmail,
				subject: 'Welcome to Figpack - Your API Key',
				html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Figpack</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
<h1 style="color: #2c3e50; margin-top: 0;">Welcome to Figpack!</h1>
<p>Hello ${name.trim()},</p>
<p>Your Figpack account has been successfully created. Below is your API key that you'll need to authenticate and manage your figures.</p>

<div style="background-color: #fff; border: 2px solid #0066cc; border-radius: 4px; padding: 20px; margin: 24px 0; text-align: center;">
<p style="margin: 0 0 8px 0; font-weight: bold; color: #495057; font-size: 14px;">Your API Key:</p>
<p style="margin: 0; font-family: 'Courier New', monospace; font-size: 16px; color: #212529; word-break: break-all;">${apiKey}</p>
</div>

<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
<p style="margin: 0; font-weight: bold; color: #856404;">Important:</p>
<p style="margin: 8px 0 0 0; color: #856404;">
Keep this API key secure and do not share it publicly. You'll need it to upload and manage your figures.
</p>
</div>

<h2 style="color: #2c3e50; margin-top: 24px;">Getting Started</h2>
<ol style="color: #495057;">
<li style="margin-bottom: 8px;">Install figpack: <code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px;">pip install figpack</code></li>
<li style="margin-bottom: 8px;">Set your API key as an environment variable: <code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px;">export FIGPACK_API_KEY="${apiKey}"</code></li>
<li style="margin-bottom: 8px;">Visit the <a href="https://figpack.org" style="color: #0066cc;">documentation</a> to learn how to create and share figures</li>
<li style="margin-bottom: 8px;">Manage your figures at <a href="https://manage.figpack.org" style="color: #0066cc;">manage.figpack.org</a></li>
</ol>

<p style="color: #6c757d; font-size: 14px; margin-top: 24px;">
If you have any questions or need assistance, please don't hesitate to reach out.
</p>
</div>
<div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 24px;">
<p>This is an automated message from Figpack. Please do not reply to this email.</p>
<p>&copy; ${new Date().getFullYear()} Figpack. All rights reserved.</p>
</div>
</body>
</html>
`,
			});
		} catch (emailErr) {
			console.error('Failed to send welcome email to user:', emailErr);
			// Continue - account was created successfully even if email failed
		}

		// Send notification to admins
		try {
			const adminUsers = await env.figpack_db.prepare('SELECT email, name FROM users WHERE is_admin = 1').all();

			if (adminUsers.results && adminUsers.results.length > 0) {
				const adminEmails = adminUsers.results.map((admin: any) => admin.email as string);

				await resend.emails.send({
					from: 'noreply@figpack.org',
					to: adminEmails,
					subject: `New Figpack Account Created - ${name.trim()}`,
					html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Figpack Account Created</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
<h1 style="color: #2c3e50; margin-top: 0;">New Figpack Account Created</h1>
<p>A new user account has been automatically created using a valid access code.</p>

<div style="background-color: #fff; border: 2px solid #e9ecef; border-radius: 4px; padding: 16px; margin: 20px 0;">
<table style="width: 100%; border-collapse: collapse;">
<tr>
<td style="padding: 8px 0; font-weight: bold; color: #495057; width: 180px;">Name:</td>
<td style="padding: 8px 0; color: #212529;">${name.trim()}</td>
</tr>
<tr>
<td style="padding: 8px 0; font-weight: bold; color: #495057;">Email:</td>
<td style="padding: 8px 0; color: #212529;">${normalizedEmail}</td>
</tr>
<tr>
<td style="padding: 8px 0; font-weight: bold; color: #495057; vertical-align: top;">Research Description:</td>
<td style="padding: 8px 0; color: #212529;">${researchDescription.trim().replace(/\n/g, '<br>')}</td>
</tr>
<tr>
<td style="padding: 8px 0; font-weight: bold; color: #495057;">Access Code Used:</td>
<td style="padding: 8px 0; color: #212529;">${accessCode.trim()}</td>
</tr>
<tr>
<td style="padding: 8px 0; font-weight: bold; color: #495057;">Created At:</td>
<td style="padding: 8px 0; color: #212529;">${new Date().toUTCString()}</td>
</tr>
</table>
</div>

<div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 12px; margin: 20px 0; border-radius: 4px;">
<p style="margin: 0; font-weight: bold; color: #0c5460;">Account Status:</p>
<p style="margin: 8px 0 0 0; color: #0c5460;">
The account has been created and the user has been sent their API key via email. No further action is required.
</p>
</div>

<p style="color: #6c757d; font-size: 14px; margin-top: 24px;">
This is an automated notification from the Figpack account creation system.
</p>
</div>
<div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 24px;">
<p>This is an automated message from Figpack. Please do not reply to this email.</p>
<p>&copy; ${new Date().getFullYear()} Figpack. All rights reserved.</p>
</div>
</body>
</html>
`,
				});
			}
		} catch (emailErr) {
			console.error('Failed to send admin notification email:', emailErr);
			// Continue - account was created successfully even if admin notification failed
		}

		return json(
			{
				success: true,
				message: 'Your account has been created successfully! Please check your email for your API key.',
			},
			200,
			{
				'X-RateLimit-Limit': '3',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
			},
		);
	} catch (err) {
		console.error('Error processing account request:', err);
		return json({ success: false, message: 'Failed to process account request. Please try again later.' }, 500);
	}
}
