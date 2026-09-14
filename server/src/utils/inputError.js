const getInputError = (error) => {
	if (!error) return null;

	if (error.name === "ValidationError") {
		const firstError = Object.values(error.errors || {})[0];
		const message = firstError?.message || error.message || "Invalid input";
		return {
			status: 400,
			message,
		};
	}

	if (error.name === "CastError") {
		return {
			status: 400,
			message: `Invalid ${error.path || "value"}: ${error.reason?.message || error.message}`,
		};
	}

	if (error.code === 11000) {
		return {
			status: 409,
			message: "A record with this value already exists.",
		};
	}

	return null;
};

module.exports = {
	getInputError,
};
