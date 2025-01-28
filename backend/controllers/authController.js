const Marketer = require('../models/Marketer');

const register = async (req, res) => {
  const { fullName, email, password, bankAccount, referralCode } = req.body;

  try {
    // Check if email already exists
    let marketer = await Marketer.findOne({ email });
    if (marketer) return res.status(400).json({ message: 'Email already exists' });

    // Generate a unique referral link for the new marketer
    const referralLink = `${process.env.BASE_URL}/register?ref=${email}`;

    // Create a new marketer document
    marketer = new Marketer({
      fullName,
      email,
      password,
      bankAccount,
      referralLink,
    });

    if (referralCode) {
      // Find the upline marketer using the referral link
      const upline = await Marketer.findOne({ referralLink: referralCode });

      if (upline) {
        marketer.upline = upline._id; // Set the direct upline (parent)
        upline.downlines.push(marketer._id); // Add the current marketer as a downline

        // Save the parent marketer changes
        await upline.save();

        // Handle second-level (grandparent) and third-level (great-grandparent) relationships
        const grandparent = await Marketer.findById(upline.upline);
        if (grandparent) {
          grandparent.downlines.push(marketer._id);
          await grandparent.save();

          const greatGrandparent = await Marketer.findById(grandparent.upline);
          if (greatGrandparent) {
            greatGrandparent.downlines.push(marketer._id);
            await greatGrandparent.save();
          }
        }
      }
    }

    // Save the new marketer
    await marketer.save();

    res.status(201).json({ message: 'Registration successful', referralLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { register };
