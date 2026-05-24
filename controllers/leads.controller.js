import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
CREATE LEAD
========================================
Used by:
- Website chatbot
- Public chatbot
- WhatsApp automation
- Facebook automation
- Instagram automation
========================================
*/
export const createLead =
  async (
    req,
    res
  ) => {

    try {

      const {

        name,

        email,

        message,

        chatbot_id,

        user_id,

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
      INSERT LEAD
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from("leads")
          .insert([{

            name:
              name ||
              "Unknown",

            email:
              email ||
              null,

            message:
              message ||
              null,

            chatbot_id,

            user_id,

          }])
          .select()
          .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

        message:
          "Lead captured successfully",

        lead:
          data,
      });

    } catch (err) {

      console.error(
        "❌ CREATE LEAD ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to create lead",
        });
    }
  };

/*
========================================
GET LEADS
========================================
Dashboard page
========================================
*/
export const getLeads =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      /*
      ========================================
      GET LEADS
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from("leads")
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

        leads:
          data || [],
      });

    } catch (err) {

      console.error(
        "❌ GET LEADS ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to fetch leads",
        });
    }
  };

/*
========================================
DELETE LEAD
========================================
*/
export const deleteLead =
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
          .from("leads")
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
          "Lead deleted successfully",
      });

    } catch (err) {

      console.error(
        "❌ DELETE LEAD ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to delete lead",
        });
    }
  };

/*
========================================
EXPORT LEADS CSV
========================================
*/
export const exportLeadsCSV =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      /*
      ========================================
      GET LEADS
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from("leads")
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

      /*
      ========================================
      CSV
      ========================================
      */
      const headers = [

        "Name",

        "Email",

        "Message",

        "Created At",
      ];

      const rows =
        (data || []).map(
          (
            lead
          ) => [

            `"${lead.name || ""}"`,

            `"${lead.email || ""}"`,

            `"${lead.message || ""}"`,

            `"${new Date(
              lead.created_at
            ).toLocaleString()}"`,
          ]
        );

      const csv =
        [
          headers.join(","),

          ...rows.map(
            (
              row
            ) =>
              row.join(",")
          ),
        ].join("\n");

      /*
      ========================================
      RESPONSE
      ========================================
      */
      res.setHeader(
        "Content-Type",
        "text/csv"
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=aiaera-leads.csv"
      );

      return res.send(
        csv
      );

    } catch (err) {

      console.error(
        "❌ EXPORT CSV ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Failed to export leads",
        });
    }
  };

/*
========================================
LEAD STATS
========================================
*/
export const getLeadStats =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      /*
      ========================================
      GET LEADS
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from("leads")
          .select("*")
          .eq(
            "user_id",
            user_id
          );

      if (error)
        throw error;

      const leads =
        data || [];

      /*
      ========================================
      STATS
      ========================================
      */
      const totalLeads =
        leads.length;

      const emailsCollected =
        leads.filter(
          (
            lead
          ) =>
            lead.email
        ).length;

      const messagesCollected =
        leads.filter(
          (
            lead
          ) =>
            lead.message
        ).length;

      return res.json({

        success:
          true,

        stats: {

          totalLeads,

          emailsCollected,

          messagesCollected,
        },
      });

    } catch (err) {

      console.error(
        "❌ LEAD STATS ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Failed to fetch lead stats",
        });
    }
  };