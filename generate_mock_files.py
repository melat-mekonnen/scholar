import os

test_dir = r"c:\Users\Marsu\Desktop\Flex\scholar\test_files"
os.makedirs(test_dir, exist_ok=True)

with open(os.path.join(test_dir, "mock_document.pdf"), "wb") as f:
    f.write(b"%PDF-1.4\n%Fake PDF content for testing uploads")

with open(os.path.join(test_dir, "mock_image.jpg"), "wb") as f:
    f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00Fake JPG content")

with open(os.path.join(test_dir, "mock_oversized.pdf"), "wb") as f:
    f.write(b"%PDF-1.4\n")
    # Write 12MB in chunks to save memory during script creation
    chunk = os.urandom(1024 * 1024)
    for _ in range(12):
        f.write(chunk)

with open(os.path.join(test_dir, "mock_executable.exe"), "wb") as f:
    f.write(b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00\xb8\x00\x00\x00Fake Executable")

print("Mock files generated.")
