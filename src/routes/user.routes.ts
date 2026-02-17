import { Router, Request, Response } from "express";
import { userService } from "../services";
import { CreateUserDTO, UpdateUserDTO } from "../models";

const router = Router();

/**
 * GET /api/users
 * Get all users with pagination
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        
        const users = await userService.findAll(limit, offset);
        const total = await userService.count();
        
        res.json({
            success: true,
            data: users,
            pagination: { limit, offset, total },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const user = await userService.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        res.json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { email, password, fullname } = req.body as CreateUserDTO;

        if (!email || !password || !fullname) {
            return res.status(400).json({
                success: false,
                error: "Email, password, and fullname are required",
            });
        }

        // Check if email already exists
        if (await userService.emailExists(email)) {
            return res.status(409).json({ success: false, error: "Email already exists" });
        }

        const user = await userService.create({ email, password, fullname });
        res.status(201).json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/users/:id
 * Update user by ID
 */
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const data: UpdateUserDTO = req.body;

        // Check if email is being updated and if it already exists
        if (data.email && await userService.emailExists(data.email, id)) {
            return res.status(409).json({ success: false, error: "Email already exists" });
        }

        const user = await userService.update(id, data);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        res.json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/users/:id
 * Delete user by ID
 */
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const deleted = await userService.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
