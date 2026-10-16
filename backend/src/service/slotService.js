const DoctorSchedule = require("../models/DoctorSchedule");
const Appointment = require("../models/Appointment");

const timeToMinutes = (timeStr) => {
    const parts = timeStr.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    return `${hh}:${mm}`;
};

const generateSlotsForDoctor = async (doctorId, dateString) => {
    const dateObj = new Date(dateString);
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = days[dateObj.getDay()];

    let schedule = await DoctorSchedule.findOne({ doctor: doctorId });

    if (!schedule) {
        schedule = {
            workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
            slotDuration: 15,
            sessions: [
                { startTime: "09:00", endTime: "13:00", name: "Morning OPD" },
                { startTime: "17:00", endTime: "20:00", name: "Evening OPD" },
            ],
            breaks: [
                { startTime: "13:00", endTime: "17:00", name: "Afternoon Break" },
            ],
        };
    }

    if (!schedule.workingDays.includes(dayOfWeek)) {
        return [];
    }

    const duration = schedule.slotDuration || 15;

    const breaks = (schedule.breaks || []).map((b) => ({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
    }));

    const bookedAppointments = await Appointment.find({
        doctor: doctorId,
        date: dateString,
        status: { $ne: "cancelled" },
    }).select("slotTime");

    const bookedTimes = bookedAppointments.map((a) => a.slotTime);

    const now = new Date();
    const isToday = now.toISOString().split("T")[0] === dateString;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = [];

    for (const session of schedule.sessions) {
        const sessionStart = timeToMinutes(session.startTime);
        const sessionEnd = timeToMinutes(session.endTime);

        let currentTime = sessionStart;

        while (currentTime + duration <= sessionEnd) {
            const slotStart = currentTime;
            const slotEnd = currentTime + duration;

            const inBreak = breaks.some((brk) => {
                return (slotStart >= brk.start && slotStart < brk.end) ||
                       (slotEnd > brk.start && slotEnd <= brk.end);
            });

            if (!inBreak) {
                const timeStr = minutesToTime(slotStart);
                const endTimeStr = minutesToTime(slotEnd);
                const isPast = isToday && slotStart <= currentMinutes;
                const isBooked = bookedTimes.includes(timeStr);

                slots.push({
                    time: timeStr,
                    endTime: endTimeStr,
                    isBooked: isBooked,
                    isPast: isPast,
                    isAvailable: !isBooked && !isPast,
                    session: session.name,
                });
            }

            currentTime = currentTime + duration;
        }
    }

    return slots;
};

module.exports = { generateSlotsForDoctor };
