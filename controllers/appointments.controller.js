import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
CREATE APPOINTMENT
========================================
Used by:
- Website chatbot
- Public chatbot
- WhatsApp automation
- Facebook automation
- Instagram automation
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

        chatbot_id,

        user_id,

        calendly_event_link,

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

            success:
              false,

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
          .from(
            "appointments"
          )
          .insert([{

            customer_name:
              customer_name ||
              "Unknown",

            customer_email:
              customer_email ||
              null,

            chatbot_id,

            user_id,

            calendly_event_link:
              calendly_event_link ||
              null,

          }])
          .select()
          .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

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

          success:
            false,

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
Dashboard page
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

      /*
      ========================================
      GET APPOINTMENTS
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "appointments"
          )
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

        success:
          true,

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

          success:
            false,

          error:
            err.message ||
            "Failed to fetch appointments",
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

      /*
      ========================================
      DELETE
      ========================================
      */
      const {
        error,
      } =
        await supabase
          .from(
            "appointments"
          )
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

        success:
          true,

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

          success:
            false,

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

      /*
      ========================================
      GET APPOINTMENTS
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "appointments"
          )
          .select("*")
          .eq(
            "user_id",
            user_id
          );

      if (error)
        throw error;

      const appointments =
        data || [];

      /*
      ========================================
      STATS
      ========================================
      */
      const totalAppointments =
        appointments.length;

      const customers =
        appointments.filter(
          (
            item
          ) =>
            item.customer_name
        ).length;

      const bookedMeetings =
        appointments.filter(
          (
            item
          ) =>
            item.calendly_event_link
        ).length;

      return res.json({

        success:
          true,

        stats: {

          totalAppointments,

          customers,

          bookedMeetings,
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

          success:
            false,

          error:
            "Failed to fetch appointment stats",
        });
    }
  };