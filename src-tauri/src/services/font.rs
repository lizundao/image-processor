use anyhow::Result;
use fontdb::Database;
use std::collections::HashSet;

/// 获取系统字体列表
pub async fn get_system_fonts() -> Result<Vec<String>> {

    
    let mut db = Database::new();
    db.load_system_fonts();
    
    let mut font_families = HashSet::new();
    
    // 遍历所有字体，收集字体族名称
    for face in db.faces() {
        for family in &face.families {
            font_families.insert(family.0.clone());
        }
    }
    
    // 转换为排序的向量
    let mut fonts: Vec<String> = font_families.into_iter().collect();
    fonts.sort();
    

    
    // 添加一些常用的默认字体（如果系统中没有的话）
    let default_fonts = vec![
        "Arial".to_string(),
        "Times New Roman".to_string(),
        "Helvetica".to_string(),
        "Courier New".to_string(),
        "Verdana".to_string(),
        "Georgia".to_string(),
        "Comic Sans MS".to_string(),
        "Impact".to_string(),
        "Trebuchet MS".to_string(),
        "Lucida Console".to_string(),
        // 中文字体
        "Microsoft YaHei".to_string(),
        "SimSun".to_string(),
        "SimHei".to_string(),
        "KaiTi".to_string(),
        "FangSong".to_string(),
        "Microsoft JhengHei".to_string(),
        "PingFang SC".to_string(),
        "Hiragino Sans GB".to_string(),
        "Source Han Sans CN".to_string(),
        "Noto Sans CJK SC".to_string(),
    ];
    
    // 合并默认字体，去重并排序
    for default_font in default_fonts {
        if !fonts.contains(&default_font) {
            fonts.push(default_font);
        }
    }
    
    fonts.sort();
    
    Ok(fonts)
}

/// 根据字体名称获取字体文件路径
#[allow(dead_code)]
pub async fn get_font_path(font_family: &str) -> Result<Option<String>> {
    
    let mut db = Database::new();
    db.load_system_fonts();
    
    // 查找指定字体族的字体
    for face in db.faces() {
        for family in &face.families {
            if family.0.eq_ignore_ascii_case(font_family) {
                if let fontdb::Source::File(ref path) = face.source {
                    let path_str = path.to_string_lossy().to_string();
                    return Ok(Some(path_str));
                }
            }
        }
    }
    
    Ok(None)
}

/// 获取默认字体路径
#[allow(dead_code)]
pub async fn get_default_font_path() -> Result<String> {
    // 尝试常用的中文字体
    let chinese_fonts = vec![
        "Microsoft YaHei",
        "SimSun",
        "SimHei",
        "PingFang SC",
        "Hiragino Sans GB",
        "Source Han Sans CN",
        "Noto Sans CJK SC",
    ];
    
    for font in chinese_fonts {
        if let Ok(Some(path)) = get_font_path(font).await {
            return Ok(path);
        }
    }
    
    // 如果没有中文字体，尝试英文字体
    let english_fonts = vec![
        "Arial",
        "Times New Roman",
        "Helvetica",
        "Verdana",
        "Georgia",
    ];
    
    for font in english_fonts {
        if let Ok(Some(path)) = get_font_path(font).await {
            return Ok(path);
        }
    }
    
    // 如果都没有找到，返回错误
    Err(anyhow::anyhow!("未找到可用的系统字体"))
}
