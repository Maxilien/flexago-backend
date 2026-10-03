//Routes/OnboardingRountes.js

router.post("/account-link", async (req, res) => {
  try {
    const { accountId } = req.body;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://flexago.com/onboarding/refresh",
      return_url: "https://flexago.com/onboarding/complete",
      type: "account_onboarding"
    });

    res.json({ url: link.url });

  } catch (err) {
    console.error("Account Link Error:", err);
    res.status(500).json({ error: "Failed to generate onboarding link" });
  }
});
