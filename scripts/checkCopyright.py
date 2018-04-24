#!/usr/bin/env python3

import glob, os
import datetime


NOW = datetime.datetime.now()

COPYRIGHT = """Copyright {now.year}. Akamai Technologies, Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.""".format(now = NOW)


COPYRIGHT = "\n".join(map(lambda x: r"//  " + x, COPYRIGHT.split("\n"))) + "\n\n\n"


scriptDir = os.path.dirname(os.path.realpath(__file__))
projectDir = os.path.realpath(os.path.join(scriptDir, '..'))

paths = ["bin/akamai-promotional-deployment", "src/**/*.js", "tests/*.js"]

def findFiles(paths):
    allFiles = []
    for path in paths:
        allFiles.extend(glob.glob(os.path.join(projectDir, path), recursive=True))
    return allFiles

def checkCopyRight(filePath):
    fullPath = os.path.join(__file__, filePath)
    print("checking: ", fullPath)
    hasCopyRight = False
    shebangWarning = False
    lines = []
    line = ''
    with open(fullPath) as f:
        for lineNum in range(5):
            line = f.readline()
            if line == '':
                break
            if line.startswith("#!"):
                shebangWarning = True
            if "Copyright" in line:
                hasCopyRight = True
            lines.append(line)
        if not hasCopyRight:
            while line != '':
                line = f.readline()
                lines.append(line)

    if not hasCopyRight:
        print("updating: ", fullPath)
        with open(fullPath, 'w') as f:
            if shebangWarning:
                f.write(lines[0]+"\n")
            f.write(COPYRIGHT)
            if shebangWarning:
                f.writelines(lines[1:])
            else:
                f.writelines(lines)

def checkFiles(paths):
    for fileName in findFiles(paths):
        checkCopyRight(fileName)

if __name__ == '__main__':
    checkFiles(paths)