import os

def merge_project_files(source_dir, output_file):
    # 1. 定义需要忽略的文件夹
    IGNORE_DIRS = {
        'node_modules', 
        '.git', 
        '.idea', 
        '.vscode', 
        'dist', 
        'build', 
        'coverage',
        '__pycache__'
    }

    # 2. 定义需要忽略的具体文件名
    IGNORE_FILES = {
        'package-lock.json', 
        'yarn.lock', 
        'pnpm-lock.yaml',
        '.DS_Store',
        'movies.json',
        os.path.basename(output_file) # 防止把自己也写进去
    }

    # 3. 定义不仅不需要读取，而且通常是二进制的图片/文件后缀（避免乱码）
    BINARY_EXTENSIONS = {
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', 
        '.woff', '.woff2', '.ttf', '.eot', 
        '.mp4', '.mp3', '.exe', '.dll', '.pyc'
    }

    # 用于统计
    file_count = 0
    
    try:
        with open(output_file, 'w', encoding='utf-8') as outfile:
            # 写入文件头信息
            outfile.write(f"Project Source: {source_dir}\n")
            outfile.write("=" * 50 + "\n\n")

            # 遍历目录
            for root, dirs, files in os.walk(source_dir):
                # 修改 dirs 列表，以便在遍历时跳过忽略的文件夹
                # 注意：必须原地修改 dirs[:]
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

                for file in files:
                    file_path = os.path.join(root, file)
                    file_name = file
                    file_ext = os.path.splitext(file)[1].lower()

                    # 检查文件名是否在忽略列表中
                    if file_name in IGNORE_FILES:
                        continue
                    
                    # 检查是否是二进制/图片文件
                    if file_ext in BINARY_EXTENSIONS:
                        continue

                    # 尝试读取并写入
                    try:
                        # 构造相对路径，方便阅读
                        relative_path = os.path.relpath(file_path, source_dir)
                        
                        outfile.write(f"FILE_PATH: {relative_path}\n")
                        outfile.write("-" * 20 + " START " + "-" * 20 + "\n")
                        
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            outfile.write(content)
                            
                        outfile.write("\n" + "-" * 20 + "  END  " + "-" * 20 + "\n")
                        outfile.write("\n\n")
                        
                        print(f"已处理: {relative_path}")
                        file_count += 1

                    except UnicodeDecodeError:
                        print(f"[跳过] 无法以UTF-8解码文件 (可能是二进制文件): {relative_path}")
                    except Exception as e:
                        print(f"[错误] 读取文件出错 {relative_path}: {e}")

        print(f"\n完成！共合并了 {file_count} 个文件。")
        print(f"结果已保存至: {os.path.abspath(output_file)}")

    except Exception as e:
        print(f"程序运行出错: {e}")

if __name__ == '__main__':
    # 配置路径
    # 注意：Windows路径建议在引号前加 r，防止转义字符问题
    SOURCE_DIRECTORY = r"C:\Users\杨礼煜同学\Desktop\movie-management-system\movie-management-system"
    OUTPUT_FILENAME = "project_code_context.txt"

    merge_project_files(SOURCE_DIRECTORY, OUTPUT_FILENAME)