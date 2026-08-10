import React, { useState, useEffect } from "react";
import { Avatar } from "@mui/material";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/endpoints";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  // Pre-fill form when entering edit mode
  useEffect(() => {
    if (isEditing && user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        password: "",
      });
      setError(null);
    }
  }, [isEditing, user]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
      };
      if (formData.password.trim()) {
        if (formData.password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        payload.password = formData.password;
      }

      const res = await authApi.updateMe(payload);
      
      // If password was changed, we force re-login
      if (payload.password) {
        alert("Your password has been changed successfully. Please log in again with your new password.");
        logout();
        return; // Stop execution as we are logging out
      }

      // If no password change, just update context and exit edit mode
      setUser(res.data);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Topbar title="Profile" subtitle="Your account details." />
      <main className="p-8 max-w-lg">
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 p-6 text-center relative">
          
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-5 right-5 px-3 py-1.5 rounded-lg bg-white border border-border text-ink font-bold hover:bg-paper transition text-xs shadow-sm"
            >
              ✏️ Edit Profile
            </button>
          )}

          <Avatar sx={{ width: 64, height: 64, bgcolor: "#0F8B8D", fontSize: 24, margin: "0 auto" }}>
            {user?.full_name?.[0]?.toUpperCase() || "?"}
          </Avatar>
          
          {!isEditing ? (
            <>
              <h2 className="font-display text-xl font-semibold text-ink mt-3">{user?.full_name}</h2>
              <p className="text-sm text-ink-muted">{user?.email}</p>
              <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-mono uppercase bg-teal-light text-teal-dark font-bold tracking-wider shadow-sm">
                {user?.role}
              </span>
            </>
          ) : (
            <form onSubmit={handleSave} className="mt-6 space-y-4 text-left">
              {error && (
                <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200">
                  {error}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full bg-paper border border-border rounded-xl p-2.5 text-sm text-ink focus:outline-none focus:border-teal shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-paper border border-border rounded-xl p-2.5 text-sm text-ink focus:outline-none focus:border-teal shadow-inner"
                />
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <label className="text-xs font-bold text-ink uppercase tracking-wider">Change Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password (min 8 chars)"
                  className="w-full bg-paper border border-border rounded-xl p-2.5 text-sm text-ink focus:outline-none focus:border-teal shadow-inner"
                />
                <p className="text-[10px] text-ink-muted italic pl-1 pt-1">
                  Leave blank if you do not want to change your password. Note: Changing your password will log you out.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-border text-ink font-bold hover:bg-paper transition text-sm shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-teal text-white font-bold hover:bg-teal-dark transition text-sm shadow-sm disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 p-5 mt-5">
          <h3 className="font-display font-semibold text-ink mb-3 text-sm">Account Metadata</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-ink-muted font-medium">User ID</span>
              <span className="font-mono text-xs text-ink">{user?.id}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-ink-muted font-medium">System Role</span>
              <span className="text-ink capitalize font-bold">{user?.role}</span>
            </div>
          </div>
          <p className="text-xs text-ink-muted mt-4 bg-paper p-3 rounded-xl border border-border leading-relaxed">
            Role changes must be performed by an Administrator from the Admin Panel. 
          </p>
        </div>
      </main>
    </>
  );
}
