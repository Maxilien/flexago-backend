//Routes/AccountStatusRountes.js

router.post("/get-account-status", async (req, res) => {
  try {
    const { accountId } = req.body;

    const account = await stripe.accounts.retrieve(accountId);

    res.json({
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted
    });

  } catch (err) {
    console.error("Account Status Error:", err);
    res.status(500).json({ error: "Failed to retrieve account status" });
  }
});
