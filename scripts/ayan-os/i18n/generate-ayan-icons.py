"""Generate branded Windows shortcut .ico + PNG from AYAN mountain/sun/river mark.
No internet, no external API, no user files outside the AYAN OS brand folder.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(r"C:\AI\ayan-os\public\ayan-os")
SIZE=1024
S=SIZE/512
GOLD=(231,183,111)
NAVY=(11,23,42)
def coord(point):return (round(point[0]*S),round(point[1]*S))
def interp(points, count=200):
    # smooth Catmull-Rom curve with endpoint preservation
    out=[]
    for k in range(len(points)-1):
        p0=points[max(0,k-1)]
        p1=points[k]
        p2=points[k+1]
        p3=points[min(len(points)-1,k+2)]
        for j in range(count//(len(points)-1)):
            t=j/(count//(len(points)-1));t2=t*t;t3=t2*t
            x=.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3)
            y=.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
            out.append(coord((x,y)))
    out.append(coord(points[-1]))
    return out
im=Image.new("RGBA",(SIZE,SIZE),(0,0,0,0))
pix=im.load()
for y in range(SIZE):
    fy=y/(SIZE-1)
    for x in range(SIZE):
        fx=x/(SIZE-1)
        bump=max(0,1-math.hypot(fx-.29,fy-.17))*.09
        pix[x,y]=(int(14+(1-fy)*10 + bump*16),int(24+(1-fy)*18+bump*19),int(42+(1-fy)*24+bump*28),255)
mask=Image.new("L",(SIZE,SIZE),0)
md=ImageDraw.Draw(mask)
md.rounded_rectangle((0,0,SIZE-1,SIZE-1),radius=round(112*S),fill=255)
im.putalpha(mask)
# moon halo, blurred, clipped to icon
halo=Image.new("RGBA",(SIZE,SIZE),(0,0,0,0))
h=ImageDraw.Draw(halo)
h.ellipse((*coord((160,130)),*coord((376,346))),fill=(244,201,129,65))
halo=halo.filter(ImageFilter.GaussianBlur(64))
im=Image.alpha_composite(im,halo)
d=ImageDraw.Draw(im)
# background landscape lines
for shift in [0,34]:
    d.line(interp([(8,343+shift),(115,316+shift),(188,341+shift),(282,320+shift),(388,333+shift),(515,335+shift)]),
           fill=(64,80,100,72),width=3)
def glowline(points,width):
    buff=Image.new("RGBA",(SIZE,SIZE))
    bd=ImageDraw.Draw(buff)
    bd.line(points,fill=(240,196,123,38),width=width+22,joint="curve")
    return buff.filter(ImageFilter.GaussianBlur(19))
mountain=interp([(112,347),(181,215),(227,125),(245,111),(267,125),(330,233),(394,345)])
im=Image.alpha_composite(im,glowline(mountain,round(44*S)))
d=ImageDraw.Draw(im)
d.line(mountain,fill=(214,158,83,255),width=round(43*S),joint="curve")
d.line(mountain,fill=(252,226,175,255),width=round(30*S),joint="curve")
d.line(mountain,fill=(222,179,112,255),width=round(13*S),joint="curve")
sun=coord((268,238));radius=round(46*S)
d.ellipse((sun[0]-radius,sun[1]-radius,sun[0]+radius,sun[1]+radius),fill=(238,193,121,255))
d.ellipse((sun[0]-radius+10,sun[1]-radius+9,sun[0]+radius-12,sun[1]+radius-11),fill=(247,215,161,255))
river=interp([(125,357),(177,323),(221,312),(267,324),(318,346),(369,319),(388,298)])
d.line(river,fill=(235,194,125,255),width=round(15*S),joint="curve")
river2=interp([(128,389),(189,360),(253,370),(309,393),(367,388),(402,370)])
d.line(river2,fill=(235,189,114,180),width=round(6*S),joint="curve")
d.line(interp([(124,428),(202,422),(290,421),(386,428)]),fill=(235,189,114,80),width=3)
# Avoid alpha halos escaping corner bounds
alpha=Image.composite(im.getchannel("A"),Image.new("L",(SIZE,SIZE),0),mask)
im.putalpha(alpha)
png=ROOT/"ayan-icon.png"; ico=ROOT/"ayan-os.ico"
im.resize((512,512),Image.Resampling.LANCZOS).save(png)
im.save(ico,format="ICO",sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print("AYAN_BRAND_ASSETS_OK PNG_BYTES",png.stat().st_size,"ICO_BYTES",ico.stat().st_size)
