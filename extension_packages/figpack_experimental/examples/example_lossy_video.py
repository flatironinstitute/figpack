import figpack_experimental.views as fpj
import numpy as np


def create_circle(frame, center, radius, color):
    h, w = frame.shape[:2]
    y, x = np.ogrid[:h, :w]
    dist = np.sqrt((x - center[0]) ** 2 + (y - center[1]) ** 2)
    mask = dist <= radius
    frame[mask] = color


def main():
    np.random.seed(0)

    width = 640
    height = 480
    num_frames = 300
    fps = 30.0

    # Create black background frames
    data = np.zeros((num_frames, height, width, 3), dtype=np.uint8)

    # Initialize 3 balls with random positions and velocities
    balls = []
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]  # RGB colors
    radius = 20

    for i in range(3):
        balls.append(
            {
                "pos": np.array(
                    [
                        np.random.randint(radius, width - radius),
                        np.random.randint(radius, height - radius),
                    ],
                    dtype=float,
                ),
                "vel": np.array(
                    [np.random.uniform(-30, 30), np.random.uniform(-30, 30)]
                ),
                "color": colors[i],
            }
        )

    # Animate balls
    for frame_idx in range(num_frames):
        frame = data[frame_idx]

        # Update each ball
        for ball in balls:
            # Update position
            ball["pos"] += ball["vel"]

            # Bounce off walls
            if ball["pos"][0] <= radius or ball["pos"][0] >= width - radius:
                ball["vel"][0] *= -1
            if ball["pos"][1] <= radius or ball["pos"][1] >= height - radius:
                ball["vel"][1] *= -1

            # Keep ball in bounds
            ball["pos"][0] = np.clip(ball["pos"][0], radius, width - radius)
            ball["pos"][1] = np.clip(ball["pos"][1], radius, height - radius)

            # Draw ball
            create_circle(frame, ball["pos"], radius, ball["color"])

    # Create and show video
    v = fpj.LossyVideo(data=data, fps=fps)
    v.show(title="Bouncing Balls Animation", open_in_browser=True)


if __name__ == "__main__":
    main()
