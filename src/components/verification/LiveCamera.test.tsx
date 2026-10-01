import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LiveCamera from "./LiveCamera";

afterEach(() => vi.restoreAllMocks());

it("releases the front camera before switching and captures the full unmirrored selfie", async () => {
  const stopFront = vi.fn();
  const stopBack = vi.fn();
  const getUserMedia = vi.fn()
    .mockResolvedValueOnce({ getTracks: () => [{ stop: stopFront }] })
    .mockResolvedValueOnce({ getTracks: () => [{ stop: stopBack }] });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(callback => callback(new Blob(["image"], { type: "image/jpeg" })));
  const onCapture = vi.fn();
  const { container, unmount } = render(<LiveCamera facingMode="user" label="Capture" onCapture={onCapture} />);
  await waitFor(() => expect(screen.getByText("Capture")).toBeEnabled());
  fireEvent.click(screen.getByText("สลับกล้องหน้า / หลัง"));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  expect(stopFront).toHaveBeenCalled();
  expect(getUserMedia.mock.calls[1][0].video.facingMode.ideal).toBe("environment");
  await waitFor(() => expect(screen.getByText("Capture")).toBeEnabled());
  const video = container.querySelector("video")!;
  expect(video.className).toContain("object-contain");
  expect(video.className).not.toContain("scale-x");
  Object.defineProperties(video, { videoWidth: { value: 1080 }, videoHeight: { value: 1920 } });
  fireEvent.click(screen.getByText("Capture"));
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0);
  expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ type: "image/jpeg" }));
  expect(stopBack).toHaveBeenCalled();
  unmount();
});
