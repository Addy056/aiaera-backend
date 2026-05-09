import { useEffect, useState, useContext } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";

export default function useSubscription() {
  const { user } = useContext(AuthContext);

  const [isSubscribed, setIsSubscribed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    if (!user) return;

    const checkSubscription = async () => {
      try {
        const { data } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!data) {
          setIsSubscribed(true); // free allowed
          setPlan("free");
        } else {
          setPlan(data.plan);

          if (data.plan === "free") {
            setIsSubscribed(true);
          } else {
            const expiry = new Date(data.expires_at);
            setIsSubscribed(expiry > new Date());
          }
        }

      } catch (err) {
        console.error(err);
        setIsSubscribed(false);
      }

      setLoading(false);
    };

    checkSubscription();
  }, [user]);

  return { isSubscribed, loading, plan };
}