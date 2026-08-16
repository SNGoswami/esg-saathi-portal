import { NextRequest, NextResponse } from "next/server";
import { getAuthTokenFromCookies } from "@/modules/platform/auth/cookies";
import { getSupabaseServer } from "@/modules/platform/infra/supabaseServer";

export async function GET(
  request: NextRequest
) {
  try {
    const token = getAuthTokenFromCookies(request.cookies);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Validate token using Spring Boot backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const authResponse = await fetch(`${apiUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `__Host-sid=${token}`,
      },
    });

    if (!authResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const authData =
      await authResponse.json();

    // Get logged in user email
    const userEmail = authData?.email ?? authData?.user?.email;

    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user",
        },
        { status: 401 }
      );
    }

    // Supabase client
    const supabase =
      getSupabaseServer();

    // Fetch user role from users table
    const {
      data: userData,
      error: userError,
    } = await supabase
      .from("users")
      .select("role")
      .eq("email", userEmail)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User not found",
        },
        { status: 404 }
      );
    }

    // Allow only ADMIN
    if (userData.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Access denied",
        },
        { status: 403 }
      );
    }

    // Fetch unreplied contacts
    const {
      data,
      error,
    } = await supabase
      .from("contact")
      .select(`
        name,
        email,
        subject,
        message,
        created_at
      `)
      .eq("replied", false)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}