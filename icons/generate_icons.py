import zlib
import struct
import math
import os

def create_png(width, height, rgba_data):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    
    header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        row_start = y * width * 4
        raw_data.extend(rgba_data[row_start : row_start + width * 4])
        
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    iend = chunk(b'IEND', b'')
    
    return header + ihdr + idat + iend

def generate_icon(size):
    pixels = bytearray(size * size * 4)
    center = size / 2.0
    radius = size * 0.44
    corner_r = size * 0.22
    
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            
            # Rounded rect background
            dx = max(0, abs(x - center + 0.5) - (center - corner_r))
            dy = max(0, abs(y - center + 0.5) - (center - corner_r))
            dist_sq = dx * dx + dy * dy
            dist = math.sqrt(dist_sq)
            
            # Anti-aliased edge
            if dist > corner_r:
                alpha = 0.0
            elif dist > corner_r - 1.0:
                alpha = corner_r - dist
            else:
                alpha = 1.0
                
            if alpha <= 0.0:
                pixels[idx:idx+4] = [0, 0, 0, 0]
                continue
                
            # Background gradient: Indigo / Blue (#2563eb -> #7c3aed)
            t = (x + y) / (2.0 * size)
            r = int((37 * (1 - t) + 124 * t))
            g = int((99 * (1 - t) + 58 * t))
            b = int((235 * (1 - t) + 237 * t))
            
            # Normalized coordinates (-1 to 1) relative to center
            nx = (x - center + 0.5) / (size * 0.44)
            ny = (y - center + 0.5) / (size * 0.44)
            
            is_mouse = False
            is_rmb = False
            is_wheel = False
            
            # Mouse outline
            mx_w = 0.55
            
            if ny < 0:
                d_top = (nx / mx_w)**2 + ((ny - (-0.2)) / 0.55)**2
                in_body = d_top <= 1.0
            else:
                d_bot = (nx / (mx_w * 0.92))**2 + ((ny - 0.2) / 0.55)**2
                in_body = d_bot <= 1.0
                
            if in_body:
                # Scroll wheel in the center
                if abs(nx) <= 0.12 and -0.55 <= ny <= -0.12:
                    is_wheel = True
                elif ny <= -0.05:
                    if nx > 0.04:
                        is_rmb = True  # Right mouse button
                    elif nx < -0.04:
                        is_mouse = True # Left mouse button
                else:
                    if ny >= 0.05:
                        is_mouse = True
            
            if is_wheel:
                fr, fg, fb = 250, 204, 21 # Amber / gold scroll wheel
                a_elem = 1.0
            elif is_rmb:
                fr, fg, fb = 56, 189, 248 # Bright cyan RMB
                a_elem = 1.0
            elif is_mouse:
                fr, fg, fb = 255, 255, 255 # White body
                a_elem = 0.9
            else:
                fr, fg, fb = r, g, b
                a_elem = 0.0
                
            final_r = int(fr * a_elem + r * (1 - a_elem))
            final_g = int(fg * a_elem + g * (1 - a_elem))
            final_b = int(fb * a_elem + b * (1 - a_elem))
            final_a = int(alpha * 255)
            
            pixels[idx] = final_r
            pixels[idx+1] = final_g
            pixels[idx+2] = final_b
            pixels[idx+3] = final_a
            
    return create_png(size, height=size, rgba_data=pixels)

out_dir = os.path.dirname(os.path.abspath(__file__))
for sz in [16, 48, 128]:
    png_bytes = generate_icon(sz)
    out_path = os.path.join(out_dir, f'icon-{sz}.png')
    with open(out_path, 'wb') as f:
        f.write(png_bytes)
    print(f"Generated {out_path} ({sz}x{sz}, {len(png_bytes)} bytes)")
