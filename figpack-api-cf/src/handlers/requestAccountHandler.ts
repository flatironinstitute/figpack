import { Env, RateLimitResult } from '../types';
import { json } from '../utils';
import { Resend } from 'resend';

/**
 * Handler for requesting a new account
 * This endpoint is heavily rate-limited to prevent abuse
 */
export async function handleRequestAccount(request: Request, env: Env, rateLimitResult: RateLimitResult): Promise<Response> {
	try {
		const body = (await request.json()) as any;
		const { email, name, researchDescription } = body;

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

		// Get all admin users
		const adminUsers = await env.figpack_db.prepare('SELECT email, name FROM users WHERE is_admin = 1').all();

		if (!adminUsers.results || adminUsers.results.length === 0) {
			// No admins found - log this as it's a configuration issue
			console.error('No admin users found in database');
			// Don't reveal this to the user for security
			return json(
				{
					success: true,
					message: 'Your account request has been submitted. An administrator will review it and contact you via email.',
				},
				200,
				{
					'X-RateLimit-Limit': '3',
					'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
					'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
				},
			);
		}

		// Initialize Resend
		const resend = new Resend(env.RESEND_API_KEY);

		// Prepare admin email addresses
		const adminEmails = adminUsers.results.map((admin: any) => admin.email as string);

		// Send email to all admins
		await resend.emails.send({
			from: 'noreply@figpack.org',
			to: adminEmails,
			subject: `Figpack Account Request - ${name.trim()}`,
			html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Figpack Account Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
		<h1 style="color: #2c3e50; margin-top: 0;">New Figpack Account Request</h1>
		<p>A new user has requested a Figpack account. Please review the details below:</p>
		
		<div style="background-color: #fff; border: 2px solid #e9ecef; border-radius: 4px; padding: 16px; margin: 20px 0;">
			<table style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="padding: 8px 0; font-weight: bold; color: #495057; width: 180px;">Name:</td>
					<td style="padding: 8px 0; color: #212529;">${name.trim()}</td>
				</tr>
				<tr>
					<td style="padding: 8px 0; font-weight: bold; color: #495057;">Email:</td>
					<td style="padding: 8px 0; color: #212529;">${email.trim()}</td>
				</tr>
				<tr>
					<td style="padding: 8px 0; font-weight: bold; color: #495057; vertical-align: top;">Research Description:</td>
					<td style="padding: 8px 0; color: #212529;">${researchDescription.trim().replace(/\n/g, '<br>')}</td>
				</tr>
				<tr>
					<td style="padding: 8px 0; font-weight: bold; color: #495057;">Request Time:</td>
					<td style="padding: 8px 0; color: #212529;">${new Date().toUTCString()}</td>
				</tr>
			</table>
		</div>

		<div style="background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 12px; margin: 20px 0; border-radius: 4px;">
			<p style="margin: 0; font-weight: bold; color: #004085;">Next Steps:</p>
			<p style="margin: 8px 0 0 0; color: #004085;">
				To create an account for this user, please use the admin interface or contact your system administrator.
				Once the account is created, the user will receive their API key via email.
			</p>
		</div>

		<p style="color: #6c757d; font-size: 14px; margin-top: 24px;">
			This is an automated notification from the Figpack account request system.
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

		return json(
			{
				success: true,
				message: 'Your account request has been submitted. An administrator will review it and contact you via email.',
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
