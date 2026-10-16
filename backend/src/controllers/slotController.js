const { generateSlotsForDoctor } = require("../service/slotService");

const getSlots = async (req, res, next) => {
    try {
        const { doctorId, date } = req.query;

        if (!doctorId || !date) {
            return res.status(400).json({
                success: false,
                message: "Please provide both doctorId and date (YYYY-MM-DD)",
            });
        }

        const slots = await generateSlotsForDoctor(doctorId, date);

        res.status(200).json({
            success: true,
            message: "Slots retrieved successfully",
            data: { slots },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getSlots };
