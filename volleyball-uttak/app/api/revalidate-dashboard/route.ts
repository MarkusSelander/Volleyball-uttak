import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// API route for manual dashboard revalidation
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/secret key for security
    const authHeader = request.headers.get("authorization");
    const secret = process.env.REVALIDATION_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Revalidate the dashboard page
    revalidatePath("/dashboard");

    return NextResponse.json({
      message: "Dashboard revalidated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { message: "Revalidation failed", error: String(error) },
      { status: 500 }
    );
  }
}
