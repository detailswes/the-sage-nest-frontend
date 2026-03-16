const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../prisma/client');

// Step 1 & 2: Expert clicks connect — backend creates Stripe onboarding link
async function createConnectLink(req, res) {
  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert) return res.status(404).json({ error: 'Expert profile not found' });

    let accountId = expert.stripe_account_id;

    // Create a new Stripe Express account if not already connected
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' });
      accountId = account.id;

      // Step 5: Save Stripe account ID securely
      await prisma.expert.update({
        where: { id: expert.id },
        data: { stripe_account_id: accountId },
      });
    }

    // Step 3: Create onboarding link — Stripe will redirect back to platform
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.CLIENT_URL}/stripe/refresh`,
      return_url: `${process.env.CLIENT_URL}/stripe/return`,
      type: 'account_onboarding',
    });

    return res.json({ url: accountLink.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not create Stripe connect link' });
  }
}

// Step 4 & 5: Stripe returns to platform — verify onboarding completion
async function handleStripeReturn(req, res) {
  try {
    const expert = await prisma.expert.findUnique({ where: { user_id: req.user.id } });
    if (!expert || !expert.stripe_account_id) {
      return res.status(400).json({ error: 'No Stripe account found' });
    }

    const account = await stripe.accounts.retrieve(expert.stripe_account_id);
    const onboardingComplete = account.details_submitted;

    return res.json({
      stripe_account_id: expert.stripe_account_id,
      onboarding_complete: onboardingComplete,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not verify Stripe account' });
  }
}

module.exports = { createConnectLink, handleStripeReturn };
