const errorHandler = (error, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = error.message || "Internal server error";

    if (error.code === 11000) {
        statusCode = 409;
        if (error.keyPattern && error.keyPattern.slotTime) {
            message = "This appointment slot has already been booked. Please choose another slot.";
        } else if (error.keyValue) {
            message = `Duplicate value entered for: ${Object.keys(error.keyValue).join(", ")}`;
        } else {
            message = "Duplicate entry error";
        }
    }

    if (error.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(error.errors || {}).map((val) => val.message).join(", ");
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};

module.exports = errorHandler;