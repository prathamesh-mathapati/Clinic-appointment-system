const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req, res, next) => {
    try {
        const { action, role, search, page = 1, limit = 20 } = req.query;

        const query = {};

        if (action) query.action = action;
        if (role) query.userRole = role;

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [{ userName: regex }, { details: regex }, { entity: regex }];
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * limitNum;

        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.status(200).json({
            success: true,
            data: {
                logs,
                meta: {
                    total,
                    page: pageNum,
                    pages: Math.ceil(total / limitNum) || 1,
                    limit: limitNum,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAuditLogs };
