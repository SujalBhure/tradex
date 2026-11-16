import os
import zipfile

dist_dir = 'dist'
zip_filename = 'tradex-netlify-build.zip'

if not os.path.exists(dist_dir):
    raise FileNotFoundError(f"'{dist_dir}' directory does not exist. Run 'npm run build' first.")

# Remove existing zip if present
if os.path.exists(zip_filename):
    os.remove(zip_filename)

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(dist_dir):
        # Add directories with forward slashes and Unix directory permissions (0o755)
        for d in dirs:
            dir_full_path = os.path.join(root, d)
            rel_dir = os.path.relpath(dir_full_path, dist_dir).replace('\\', '/') + '/'
            zinfo = zipfile.ZipInfo(rel_dir)
            zinfo.external_attr = 0o40755 << 16  # directory permissions: rwxr-xr-x
            z.writestr(zinfo, '')

        # Add files with forward slashes and Unix file permissions (0o644)
        for f in files:
            file_full_path = os.path.join(root, f)
            rel_file = os.path.relpath(file_full_path, dist_dir).replace('\\', '/')
            with open(file_full_path, 'rb') as fp:
                data = fp.read()
            zinfo = zipfile.ZipInfo(rel_file)
            zinfo.external_attr = 0o100644 << 16  # file permissions: rw-r--r--
            zinfo.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zinfo, data)

print(f"Successfully packaged {zip_filename} with Linux POSIX forward slashes!")
