import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
CREATE APPOINTMENT
========================================
*/
export const createAppointment =
  async (
    req,
    res
  ) => {

    try {

      const {

        customer_name,
        customer_email,
        customer_phone,

        chatbot_id,
        user_id,

        meeting_link,
        provider,

        notes,

      } = req.body;

      /*
      ========================================
      VALIDATION
      ========================================
      */
      if (
        !chatbot_id ||
        !user_id
      ) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "chatbot_id and user_id are required",
          });
      }

      /*
      ========================================
      INSERT APPOINTMENT
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from("appointments")
          .insert([{

            customer_name:
              customer_name ||
              "Unknown",

            customer_email:
              customer_email ||
              null,

            customer_phone:
              customer_phone ||
              null,

            chatbot_id,

            user_id,

            meeting_link:
              meeting_link ||
              null,

            provider:
              provider ||
              "custom",

            notes:
              notes ||
              null,

            status:
              "pending",

          }])
          .select()
          .single();

      if (error)
        throw error;

      return res.json({

        success: true,

        message:
          "Appointment created successfully",

        appointment:
          data,
      });

    } catch (err) {

      console.error(
        "❌ CREATE APPOINTMENT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            err.message ||
            "Failed to create appointment",
        });
    }
  };

/*
========================================
GET APPOINTMENTS
========================================
*/
export const getAppointments =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      const {
        data,
        error,
      } =
        await supabase
          .from("appointments")
          .select("*")
          .eq(
            "user_id",
            user_id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (error)
        throw error;

      return res.json({

        success: true,

        appointments:
          data || [],
      });

    } catch (err) {

      console.error(
        "❌ GET APPOINTMENTS ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            err.message ||
            "Failed to fetch appointments",
        });
    }
  };

/*
========================================
UPDATE APPOINTMENT STATUS
========================================
*/
export const updateAppointmentStatus =
  async (
    req,
    res
  ) => {

    try {

      const { id } =
        req.params;

      const {
        status,
        notes,
      } = req.body;

      const user_id =
        req.user.id;

      const validStatuses = [

        "pending",
        "accepted",
        "rejected",
        "completed",

      ];

      if (
        !validStatuses.includes(
          status
        )
      ) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "Invalid status",
          });
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("appointments")
          .update({

            status,

            notes:
              notes ||
              null,

            updated_at:
              new Date()
                .toISOString(),

          })
          .eq(
            "id",
            id
          )
          .eq(
            "user_id",
            user_id
          )
          .select()
          .single();

      if (error)
        throw error;

      return res.json({

        success: true,

        message:
          "Appointment updated successfully",

        appointment:
          data,
      });

    } catch (err) {

      console.error(
        "❌ UPDATE APPOINTMENT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            err.message ||
            "Failed to update appointment",
        });
    }
  };

/*
========================================
DELETE APPOINTMENT
========================================
*/
export const deleteAppointment =
  async (
    req,
    res
  ) => {

    try {

      const {
        id,
      } = req.params;

      const user_id =
        req.user.id;

      const {
        error,
      } =
        await supabase
          .from("appointments")
          .delete()
          .eq(
            "id",
            id
          )
          .eq(
            "user_id",
            user_id
          );

      if (error)
        throw error;

      return res.json({

        success: true,

        message:
          "Appointment deleted successfully",
      });

    } catch (err) {

      console.error(
        "❌ DELETE APPOINTMENT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            err.message ||
            "Failed to delete appointment",
        });
    }
  };

/*
========================================
APPOINTMENT STATS
========================================
*/
export const getAppointmentStats =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      const {
        data,
        error,
      } =
        await supabase
          .from("appointments")
          .select("*")
          .eq(
            "user_id",
            user_id
          );

      if (error)
        throw error;

      const appointments =
        data || [];

      const totalAppointments =
        appointments.length;

      const pending =
        appointments.filter(
          item =>
            item.status ===
            "pending"
        ).length;

      const accepted =
        appointments.filter(
          item =>
            item.status ===
            "accepted"
        ).length;

      const rejected =
        appointments.filter(
          item =>
            item.status ===
            "rejected"
        ).length;

      const completed =
        appointments.filter(
          item =>
            item.status ===
            "completed"
        ).length;

      return res.json({

        success: true,

        stats: {

          totalAppointments,

          pending,

          accepted,

          rejected,

          completed,

        },
      });

    } catch (err) {

      console.error(
        "❌ APPOINTMENT STATS ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            "Failed to fetch appointment stats",
        });
    }
  };