import "./style.css";

const APP_NAME = "LT Paint";
const app = document.querySelector<HTMLDivElement>("#app")!;

// Canvas
const canvas = document.createElement("canvas");
const canvasWidth = 256;
const canvasHeight = 256;
const canvasColor = "white";
canvas.id = "canvas";
canvas.width = canvasWidth;
canvas.height = canvasHeight;
app.appendChild(canvas);

// 2D context
const ctx = canvas.getContext("2d");
if (ctx) {
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Title
const titleElement = document.createElement("h1");
titleElement.textContent = APP_NAME;
titleElement.style.marginBottom = "20px";
app.prepend(titleElement); // prepend to keep on top

let currentToolPreview: ToolPreview | null;
let currentStickerPreview: StickerPreview | null;
let draggingSticker: Stroke | null = null; // Currently dragged sticker

// See size of brush at mouse location
class ToolPreview {
    private lineWidth: number;
    private x: number;
    private y: number;

    constructor(initX: number, initY: number, lineWidth: number) {
        this.x = initX;
        this.y = initY;
        this.lineWidth = lineWidth;
    }

    updatePosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    updateLineWidth(lineWidth: number) {
        this.lineWidth = lineWidth;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.lineWidth / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// See sticker selected at mouse location
class StickerPreview {
    private sticker: string | null;
    private x: number;
    private y: number;
    private scale: number; // Scale factor for sticker size

    constructor(initX: number, initY: number, sticker: string, scale: number = 1) {
        this.x = initX;
        this.y = initY;
        this.sticker = sticker;
        this.scale = scale; // Initialize the scale (default 1)
    }

    updatePosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.sticker) {
            ctx.save();

            const fontSize = 30 * this.scale;
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";

            // Draw the sticker at the given position
            ctx.fillText(this.sticker, this.x, this.y);

            ctx.restore();
        }
    }
}


// Drawing
let isDrawing = false;

interface Point {
    x: number;
    y: number;
}

class Stroke {
    private points: Point[] = [];
    private lineWidth: number; // Thickness of brush
    private sticker: string | null;
    private position: Point | null;
    private color: string = "black";

    constructor(initX: number, initY: number, lineWidth: number, color: string, sticker: string | null = null) {
        if (sticker) {
            // If it's a sticker stroke
            this.sticker = sticker;
            this.position = { x: initX, y: initY };
            this.lineWidth = 0;
        } else {
            // If it's a drawing stroke
            this.points.push({ x: initX, y: initY });
            this.lineWidth = lineWidth;
            this.sticker = null;
            this.position = null;
            this.color = color;
        }
    }

    updatePosition(x: number, y: number) {
        if (this.points.length < 1)
            this.position = { x: x, y: y }
    }

    addPoint(x: number, y: number): void {
        if (!this.sticker) {
            this.points.push({ x, y });
        }
    }

    display(ctx: CanvasRenderingContext2D): void {
        if (this.sticker && this.position) {
            // Draw sticker if this stroke represents a sticker
            ctx.save();
            const fontSize = 30;
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            // ctx.fillStyle = this.color;
            ctx.fillText(this.sticker, this.position.x, this.position.y);
            ctx.restore();
        } else if (this.points.length > 0) {
            // Draw a normal stroke
            ctx.lineWidth = this.lineWidth;
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (const point of this.points) {
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }
    }
}

let currentStroke: Stroke | null = null;
let strokes: Stroke[] = [];
let currentColor: string = "black";

const drawingChanged = new Event("drawing-changed");

// pre refactored
// if (ctx) {
//     // Start drawing
//     canvas.addEventListener("mousedown", (event) => {
//         if (currentSticker) {
//             const stickerStroke = new Stroke(event.offsetX, event.offsetY, 0, currentColor, currentSticker);
//             strokes.push(stickerStroke);
//             currentSticker = null;
//             currentStickerPreview = null;
//             draggingSticker = stickerStroke; // Start dragging the newly placed sticker
//         } else {
        
//             isDrawing = true;
//             currentStroke = new Stroke(event.offsetX, event.offsetY, currentLineWidth, currentColor);
//         }
//         canvas.dispatchEvent(new Event("drawing-changed"));
//     });

    
//     canvas.addEventListener("mousemove", (event) => {
//         if (draggingSticker) { // Drag the sticker
//             draggingSticker.updatePosition(event.offsetX, event.offsetY); // Move the sticker with the mouse
//             redraw();
//         } else if (isDrawing) {
//             currentStroke?.addPoint(event.offsetX, event.offsetY);
//             redraw();
//         } else {
//             if (currentSticker) { // If a sticker is selected
//                 if (!currentStickerPreview) { // Currently no sticker preview
//                     currentStickerPreview = new StickerPreview(event.offsetX, event.offsetY, currentSticker);
//                 } else {
//                     currentStickerPreview.updatePosition(event.offsetX, event.offsetY); // If already preview, update position
//                 }
//             } else if (!currentSticker && !currentToolPreview) { // If no sticker selected and no tool preview
//                 currentToolPreview = new ToolPreview(event.offsetX, event.offsetY, currentLineWidth);
//             } else if (currentToolPreview) { // If there is tool preview
//                 currentToolPreview.updatePosition(event.offsetX, event.offsetY);
//             }

//             canvas.dispatchEvent(new Event("tool-moved"));
//         }
//     });

//     // Stop dragging or drawing
//     canvas.addEventListener("mouseup", () => {
//         if (draggingSticker) {
//             draggingSticker = null; // Stop dragging the sticker
//         }
//         if (currentStroke) {
//             strokes.push(currentStroke);
//             currentStroke = null;
//         }
//         isDrawing = false;
//         canvas.dispatchEvent(new Event("drawing-changed"));
//     });

//     // Off canvas
//     canvas.addEventListener("mouseleave", () => {
//         if (draggingSticker) {
//             draggingSticker = null; // Stop dragging when leaving canvas
            
//         }
//         if (currentStroke) {
//             strokes.push(currentStroke);
//             currentStroke = null;
//         }
//         isDrawing = false;
//         currentToolPreview = null;
//         currentStickerPreview = null;
//         canvas.dispatchEvent(new Event("tool-moved"));
//     });
// }

//  post refactored
if (ctx) {
    // helper function to dispatch a custom event
    const dispatchCustomEvent = (eventName) => canvas.dispatchEvent(new Event(eventName));

    // start a new stroke or sticker
    const startDrawingOrSticker = (event) => {
        if (currentSticker) {
            // place a sticker and start dragging it
            const stickerStroke = new Stroke(event.offsetX, event.offsetY, 0, currentColor, currentSticker);
            strokes.push(stickerStroke);
            currentSticker = null;
            currentStickerPreview = null;
            draggingSticker = stickerStroke;
        } else {
            // start freehand stroke
            isDrawing = true;
            currentStroke = new Stroke(event.offsetX, event.offsetY, currentLineWidth, currentColor);
        }
        dispatchCustomEvent("drawing-changed");
    };

    // update position for stickers or strokes
    const updateDrawingOrPreview = (event) => {
        if (draggingSticker) {
            // drag the sticker
            draggingSticker.updatePosition(event.offsetX, event.offsetY);
            redraw();
        } else if (isDrawing) {
            // continue drawing a stroke
            currentStroke?.addPoint(event.offsetX, event.offsetY);
            redraw();
        } else {
            // update preview for stickers or tools
            if (currentSticker) {
                // update sticker preview
                if (!currentStickerPreview) {
                    currentStickerPreview = new StickerPreview(event.offsetX, event.offsetY, currentSticker);
                } else {
                    currentStickerPreview.updatePosition(event.offsetX, event.offsetY);
                }
            } else if (!currentSticker && !currentToolPreview) {
                // create tool preview if none exists
                currentToolPreview = new ToolPreview(event.offsetX, event.offsetY, currentLineWidth);
            } else if (currentToolPreview) {
                // update tool preview position
                currentToolPreview.updatePosition(event.offsetX, event.offsetY);
            }
            dispatchCustomEvent("tool-moved");
        }
    };

    // stop drawing or dragging
    const stopDrawingOrDragging = () => {
        if (draggingSticker) draggingSticker = null;
        if (currentStroke) {
            strokes.push(currentStroke);
            currentStroke = null;
        }
        isDrawing = false;
        dispatchCustomEvent("drawing-changed");
    };

    // handle leaving the canvas
    const handleMouseLeave = () => {
        draggingSticker = null; // stop dragging stickers
        if (currentStroke) {
            strokes.push(currentStroke);
            currentStroke = null;
        }
        isDrawing = false;
        currentToolPreview = null;
        currentStickerPreview = null;
        dispatchCustomEvent("tool-moved");
    };

    // Add event listeners to the canvas
    canvas.addEventListener("mousedown", startDrawingOrSticker);
    canvas.addEventListener("mousemove", updateDrawingOrPreview);
    canvas.addEventListener("mouseup", stopDrawingOrDragging);
    canvas.addEventListener("mouseleave", handleMouseLeave);
}

// Redraw the canvas
function redraw() {
    if (!ctx) return;
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "black";
    for (const stroke of strokes) {
        stroke.display(ctx);
    }

    if (currentStroke) {
        currentStroke.display(ctx);
    }

    if (!isDrawing && currentToolPreview) {
        currentToolPreview.draw(ctx);
    }

    if (!isDrawing && currentStickerPreview) {
        currentStickerPreview.draw(ctx);
    }
}

// Observer
canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

// Buttons

const editKeyContainer = document.createElement("div");
editKeyContainer.style.display = "flex";
editKeyContainer.style.flexDirection = "column";
editKeyContainer.style.position = "absolute";
editKeyContainer.style.top = "20px";
editKeyContainer.style.right = "20px";
app.appendChild(editKeyContainer);

const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
clearButton.addEventListener("click", () => {
    if (ctx) {
        ctx.fillStyle = canvasColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        strokes = [];
        redoStack = [];
        currentStroke = null;
    }
});
editKeyContainer.appendChild(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
undoButton.addEventListener("click", () => {
    if (isDrawing) {
        currentStroke = null;
        isDrawing = false;
    } else if (strokes.length > 0) {
        const lastStroke = strokes.pop();
        if (lastStroke) {
            redoStack.push(lastStroke);
        }
    }
    canvas.dispatchEvent(drawingChanged);
});
editKeyContainer.appendChild(undoButton);

let redoStack: Stroke[] = [];
const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
redoButton.addEventListener("click", () => {
    if (isDrawing) {
        currentStroke = null;
        isDrawing = false;
    } else if (redoStack.length > 0) {
        const lastRedo = redoStack.pop();
        if (lastRedo !== undefined) {
            strokes.push(lastRedo);
        }
    }
    canvas.dispatchEvent(drawingChanged);
});
editKeyContainer.appendChild(redoButton);

let currentLineWidth = 2;

// Tool buttons

// Create a container for tool buttons
const toolContainer = document.createElement("div");
toolContainer.style.display = "flex";
toolContainer.style.flexDirection = "column";
toolContainer.style.position = "absolute";
toolContainer.style.bottom = "20px";
toolContainer.style.right = "20px";
app.appendChild(toolContainer);

const thinMarkerButton = document.createElement("button");
thinMarkerButton.textContent = "Thin";
thinMarkerButton.addEventListener("click", () => {
    currentLineWidth = 2;
    currentToolPreview = new ToolPreview(0, 0, currentLineWidth);
    currentSticker = null;
    currentStickerPreview = null;
});
toolContainer.appendChild(thinMarkerButton);

const thickMarkerButton = document.createElement("button");
thickMarkerButton.textContent = "Thick";
thickMarkerButton.addEventListener("click", () => {
    currentLineWidth = 10;
    currentToolPreview = new ToolPreview(0, 0, currentLineWidth);
    currentSticker = null;
    currentStickerPreview = null;
});
toolContainer.appendChild(thickMarkerButton);

// Sticker class that creates and manages its button
class Sticker {
    private stickerImage: string;
    public stickerButton: HTMLButtonElement;

    constructor(stickerImage: string) {
        this.stickerImage = stickerImage;
        this.stickerButton = document.createElement("button");
        this.stickerButton.textContent = this.stickerImage;
        this.stickerButton.addEventListener("click", () => {
            currentSticker = this.stickerImage;
            currentStickerPreview = new StickerPreview(-10, -10, currentSticker);
            currentToolPreview = null;
            canvas.dispatchEvent(new Event("tool-moved"));
        });
    }
}

// Sticker buttons
let currentSticker: string | null = null;
let stickers = ["😁", "😂", "😎"];




function createStickerButtons() {
    toolContainer.innerHTML = ''; // Clear previous buttons
    stickers.forEach((sticker) => {
        const stickerObj = new Sticker(sticker); // Create new Sticker
        toolContainer.appendChild(stickerObj.stickerButton); // Append the button from Sticker class
    });
    toolContainer.appendChild(thickMarkerButton);
    toolContainer.appendChild(thinMarkerButton);
    toolContainer.appendChild(customStickerButton);
}

// Custom sticker button
const customStickerButton = document.createElement("button");
customStickerButton.textContent = "Add Custom Sticker";
customStickerButton.addEventListener("click", () => {
    const customSticker = prompt("Enter your custom sticker:", "🌟");
    if (customSticker) {
        stickers.push(customSticker);
        createStickerButtons(); // Recreate buttons after adding a new sticker
    }
});
toolContainer.appendChild(customStickerButton);

// Initial setup to create the sticker buttons
createStickerButtons();


// Export Button
const exportButton = document.createElement("button");
exportButton.textContent = "Export";
exportButton.addEventListener("click", () => {
    
    // Create a new canvas for export
    const exportCanvas = document.createElement("canvas");
    const exportCanvasWidth = 1024;
    const exportCanvasHeight = 1024;
    const exportCanvasColor = "white";
    exportCanvas.width = exportCanvasWidth;
    exportCanvas.height = exportCanvasHeight;

    const exportCtx = exportCanvas.getContext("2d");
    if (exportCtx) {
        exportCtx.fillStyle = exportCanvasColor; // Fill the new canvas with white background
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Scale the context to match the original canvas
        exportCtx.scale(4, 4);

        for (const stroke of strokes) {
            stroke.display(exportCtx); // Use existing display method
        }
        const fileName: string | null = prompt("Name of file: \n");
        if (fileName){
            // Create a link element to trigger the download
            const link = document.createElement("a");
            link.download = `${fileName}.png`;
            link.href = exportCanvas.toDataURL("image/png"); // Get the PNG data URL
            link.click(); // Trigger the download
        } else {
            const link = document.createElement("a");
            link.download = "untitled.png";
            link.href = exportCanvas.toDataURL("image/png");
            link.click();
        }
        
    }
});
editKeyContainer.appendChild(exportButton);

const colorContainer = document.createElement("div");
colorContainer.style.display = "flex";
colorContainer.style.flexDirection = "column";
colorContainer.style.position = "absolute";
colorContainer.style.left = "20px";
app.appendChild(colorContainer);

const blackButton = document.createElement("button");
blackButton.textContent = "Black";
blackButton.addEventListener("click", () => {
    currentColor = "black";
});
colorContainer.appendChild(blackButton);

const redButton = document.createElement("button");
redButton.textContent = "Red";
redButton.addEventListener("click", () => {
    currentColor = "red";
});
colorContainer.appendChild(redButton);

const greenButton = document.createElement("button");
greenButton.textContent = "Green";
greenButton.addEventListener("click", () => {
    currentColor = "green";
});
colorContainer.appendChild(greenButton);

const blueButton = document.createElement("button");
blueButton.textContent = "Blue";
blueButton.addEventListener("click", () => {
    currentColor = "blue";
});
colorContainer.appendChild(blueButton);

