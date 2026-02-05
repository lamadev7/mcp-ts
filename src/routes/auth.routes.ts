import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { userService } from "../services";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Helper function to generate JWT
function generateToken(userId: number, email: string): string {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", async (req: Request, res: Response) => {
    try {
        const { email, password, fullname } = req.body;

        // Validation
        if (!email || !password || !fullname) {
            return res.status(400).json({
                success: false,
                error: "Email, password, and fullname are required",
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid email format",
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters long",
            });
        }

        // Check if email already exists
        if (await userService.emailExists(email)) {
            return res.status(409).json({
                success: false,
                error: "Email already registered",
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await userService.create({
            email,
            password: hashedPassword,
            fullname,
        });

        // Generate JWT token
        const token = generateToken(user.id, user.email);

        // Return user data without password
        const { password: _, ...userData } = user.toJSON();

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: userData,
                token,
            },
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required",
            });
        }

        // Find user by email
        const user = await userService.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        // Generate JWT token
        const token = generateToken(user.id, user.email);

        // Return user data without password
        const { password: _, ...userData } = user.toJSON();

        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: userData,
                token,
            },
        });
    } catch (error: any) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/auth/me
 * Get current user (requires token)
 */
router.get("/me", async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "No token provided",
            });
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
            
            const user = await userService.findById(decoded.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }

            const { password: _, ...userData } = user.toJSON();

            res.json({
                success: true,
                data: userData,
            });
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                error: "Invalid or expired token",
            });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
