// model/Intent.js
router.post("/create-intent", async (req, res) => {
  try {
    const { jobId, amount, senderEmail } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      receipt_email: senderEmail,
      metadata: { jobId }
    });

    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error("Payment Intent Error:", err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});
